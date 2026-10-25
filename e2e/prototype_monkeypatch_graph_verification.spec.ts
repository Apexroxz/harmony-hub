import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Web Audio API Prototype Monkeypatch Connection Verification", () => {
  test("Intercepts AudioNode.prototype.connect/disconnect to verify physical graph rerouting during bypass", async ({
    page,
  }) => {
    // 1. Create a 1kHz pure tone test audio file
    const testWavPath = path.resolve("./layam_prototype_audit.wav");
    const numChannels = 2;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const durationSeconds = 30;
    const numSamples = sampleRate * durationSeconds;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 1000 * t) * 0.3 * 32767;
      const offset = 44 + i * blockAlign;
      buffer.writeInt16LE(Math.floor(sample), offset);
      buffer.writeInt16LE(Math.floor(sample), offset + 2);
    }
    fs.writeFileSync(testWavPath, buffer);

    // 2. Monkeypatch AudioNode.prototype.connect & disconnect before any scripts execute
    await page.addInitScript(() => {
      const win = window as any;
      win.__AUDIONODE_LOG__ = [];
      win.__NODE_ID_MAP__ = new WeakMap();
      let nextId = 1;

      function getNodeId(node: any): string {
        if (!node) return "null";
        if (node instanceof AudioDestinationNode) return "AudioDestinationNode";
        if (node instanceof AudioParam) return "AudioParam";
        if (!win.__NODE_ID_MAP__.has(node)) {
          win.__NODE_ID_MAP__.set(node, `${node.constructor.name}_#${nextId++}`);
        }
        return win.__NODE_ID_MAP__.get(node);
      }

      const origConnect = AudioNode.prototype.connect;
      const origDisconnect = AudioNode.prototype.disconnect;

      AudioNode.prototype.connect = function (target: any, outputIndex?: number, inputIndex?: number) {
        const fromId = getNodeId(this);
        const toId = getNodeId(target);
        win.__AUDIONODE_LOG__.push({
          action: "connect",
          from: fromId,
          fromType: this.constructor.name,
          to: toId,
          toType: target ? target.constructor.name : "unknown",
          timestamp: performance.now(),
        });
        return origConnect.apply(this, arguments as any);
      } as any;

      AudioNode.prototype.disconnect = function () {
        const fromId = getNodeId(this);
        win.__AUDIONODE_LOG__.push({
          action: "disconnect",
          from: fromId,
          fromType: this.constructor.name,
          timestamp: performance.now(),
        });
        return origDisconnect.apply(this, arguments as any);
      } as any;
    });

    // 3. Load application in clean context
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // 4. Import audio file and begin playback
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_prototype_audit/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByText(/layam_prototype_audit/i).first().click();
    await page.waitForTimeout(1200);

    // 5. Open Audio Console
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // 6. Ensure Master EQ is enabled (DSP Active)
    const eqPowerBtn = page.locator("button:has-text('EQ ENABLED'), button:has-text('EQ BYPASS')").first();
    const initialText = await eqPowerBtn.innerText();
    if (initialText.includes("EQ BYPASS")) {
      await eqPowerBtn.click();
      await page.waitForTimeout(300);
      await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);
    }

    // Query active connect log for MediaElementAudioSourceNode
    const activeSourceEvents = await page.evaluate(() => {
      const win = window as any;
      const log = win.__AUDIONODE_LOG__ as Array<any>;
      return log.filter((entry) => entry.fromType === "MediaElementAudioSourceNode");
    });
    console.log("Active MediaElementAudioSourceNode Connection Events:", activeSourceEvents);

    // Assert that source connects to BiquadFilterNode (Filter 0)
    const lastActiveConnect = activeSourceEvents
      .filter((e) => e.action === "connect")
      .slice(-1)[0];
    expect(lastActiveConnect).toBeDefined();
    expect(lastActiveConnect.toType).toBe("BiquadFilterNode");

    // 7. Click EQ BYPASS (Engage Hardware Bypass)
    await eqPowerBtn.click();
    await page.waitForTimeout(300);
    await expect(eqPowerBtn).toHaveText(/EQ BYPASS/);

    // 8. Query prototype connection log after bypass
    const postBypassEvents = await page.evaluate(() => {
      const win = window as any;
      const log = win.__AUDIONODE_LOG__ as Array<any>;
      return log.filter((entry) => entry.fromType === "MediaElementAudioSourceNode");
    });
    console.log("Post-Bypass MediaElementAudioSourceNode Events:", postBypassEvents);

    // Assert: The last two events MUST be:
    // 1. disconnect() on MediaElementAudioSourceNode
    // 2. connect() from MediaElementAudioSourceNode directly to GainNode (headroomGain)
    const lastTwoBypassEvents = postBypassEvents.slice(-2);
    expect(lastTwoBypassEvents[0].action).toBe("disconnect");
    expect(lastTwoBypassEvents[1].action).toBe("connect");
    expect(lastTwoBypassEvents[1].toType).toBe("GainNode");

    // 9. Click to RE-ENABLE EQ (DSP Active)
    await eqPowerBtn.click();
    await page.waitForTimeout(300);
    await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);

    // 10. Query prototype connection log after un-bypass
    const postUnbypassEvents = await page.evaluate(() => {
      const win = window as any;
      const log = win.__AUDIONODE_LOG__ as Array<any>;
      return log.filter((entry) => entry.fromType === "MediaElementAudioSourceNode");
    });
    console.log("Post-Unbypass MediaElementAudioSourceNode Events:", postUnbypassEvents);

    // Assert: The last two events MUST be:
    // 1. disconnect() on MediaElementAudioSourceNode
    // 2. connect() from MediaElementAudioSourceNode to BiquadFilterNode (Filter 0)
    const lastTwoUnbypassEvents = postUnbypassEvents.slice(-2);
    expect(lastTwoUnbypassEvents[0].action).toBe("disconnect");
    expect(lastTwoUnbypassEvents[1].action).toBe("connect");
    expect(lastTwoUnbypassEvents[1].toType).toBe("BiquadFilterNode");

    console.log("AudioNode.prototype.connect/disconnect PROTOTYPE VERIFICATION PASSED WITH 100% CERTAINTY!");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
