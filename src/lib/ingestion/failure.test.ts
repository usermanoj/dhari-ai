import { describe, expect, it } from "vitest";
import { explainIngestFailure, technicalDetail } from "./failure";

// The fixture that matters is verbatim from a real failure: a teacher
// uploading Grade_7_Algebra_IGCSE_Foundations.pptx was told to check the file
// opened normally. It opened fine. The account had run out of credit.

const NO_CREDITS =
  "Failed after 3 attempts. Last error: You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.";

describe("when the bill has not been paid", () => {
  it("does not blame the teacher's file", () => {
    const said = explainIngestFailure(new Error(NO_CREDITS));
    expect(said).not.toMatch(/check it opens normally/i);
    expect(said).toMatch(/your file is fine/i);
  });

  it("says what is actually wrong and who can fix it", () => {
    const said = explainIngestFailure(new Error(NO_CREDITS));
    expect(said).toMatch(/run out of credit/i);
    expect(said).toMatch(/administrator/i);
  });

  it("does not tell them to try again, because it would never work", () => {
    expect(explainIngestFailure(new Error(NO_CREDITS))).not.toMatch(/try again|try this upload again/i);
  });

  it("catches the other wording, which the rate-limit branch used to swallow", () => {
    // "You exceeded your current quota, please check your plan and billing
    // details" contains "quota". Before the billing branch was put FIRST it
    // matched as a rate limit and told the teacher to retry in a minute.
    const quota = new Error("429 You exceeded your current quota, please check your plan and billing details.");
    const said = explainIngestFailure(quota);
    expect(said).toMatch(/run out of credit/i);
    expect(said).not.toMatch(/busy right now/i);
  });
});

describe("the other causes still read the way they did", () => {
  it("a real rate limit still asks for a retry", () => {
    const said = explainIngestFailure(new Error("429 Too Many Requests: rate limit reached"));
    expect(said).toMatch(/busy right now/i);
    expect(said).toMatch(/try this upload again/i);
  });

  it("an unusable model response still says so", () => {
    expect(explainIngestFailure(new Error("This model does not support response format `json_schema`."))).toMatch(
      /unusable response/i,
    );
  });

  it("a genuinely unreadable file is still named as one", () => {
    for (const m of ["file is corrupt", "not a valid zip archive", "the document is password protected"]) {
      expect(explainIngestFailure(new Error(m)), m).toMatch(/check it opens normally/i);
    }
  });
});

describe("an unrecognised failure", () => {
  it("asserts no cause it has not established", () => {
    // The old default claimed the file was unreadable for every error that
    // fell through, which is how an unpaid bill became a teacher re-exporting
    // a PowerPoint that was never broken.
    const said = explainIngestFailure(new Error("ECONNRESET socket hang up"));
    expect(said).not.toMatch(/check it opens normally/i);
    expect(said).toMatch(/could not be processed/i);
    expect(said).toMatch(/details below/i);
  });

  it("copes with something that is not an Error at all", () => {
    expect(explainIngestFailure(undefined)).toMatch(/could not be processed/i);
    expect(explainIngestFailure("just a string")).toMatch(/could not be processed/i);
  });
});

describe("technicalDetail", () => {
  it("keeps the provider's own words, which is what makes a failure diagnosable", () => {
    expect(technicalDetail(new Error(NO_CREDITS))).toMatch(/no credits remaining/i);
  });

  it("stays bounded, because provider errors can echo a whole payload", () => {
    expect(technicalDetail(new Error("x".repeat(5000))).length).toBeLessThanOrEqual(300);
  });
});
