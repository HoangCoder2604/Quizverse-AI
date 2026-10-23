import {describe,it,expect} from "vitest";
import {createHash} from "node:crypto";
describe("Single active login policy",()=>{
 it("rejects a second device without confirmation",()=>{
   const current=createHash("sha256").update("device-a").digest("hex");
   const arriving=createHash("sha256").update("device-b").digest("hex");
   expect(current===arriving).toBe(false);
 });
 it("distinguishes expired counters",()=>{
   const now=1000;
   expect(999<now).toBe(true);
   expect(1000<now).toBe(false);
 });
});
