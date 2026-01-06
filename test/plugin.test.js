import dotenv from "dotenv";
import { jest } from "@jest/globals";
import fetch from "isomorphic-fetch";
import pluginObject from "../lib/plugin";
import { mockAppWithContent } from "./test-helpers.test";

dotenv.config();

global.fetch = fetch;

describe("plugin object", () => {
  test("exposes expected entry points", () => {
    expect(pluginObject).toBeDefined();
    expect(pluginObject.insertText).toBeDefined();
    expect(typeof pluginObject.insertText["Insert time now"]).toBe("function");
  });

  test("Insert time now writes formatted time into the note and returns the time string", async () => {
    const { app, note } = mockAppWithContent("Initial content");
    const insertTimeNow = pluginObject.insertText["Insert time now"];

    const result = await insertTimeNow(app);

    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    expect(app.context.replaceSelection).toHaveBeenCalledTimes(1);
    // Note body should be replaced with the inserted markdown time string
    expect(note.body).toContain(result);
  });
});
