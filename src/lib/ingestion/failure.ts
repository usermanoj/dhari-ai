// What a teacher is told when a deck does not make it through ingest.
//
// Lives here rather than in the route so it can be tested directly: a route
// file should export its handler and nothing else, and these two are the part
// that is easy to get wrong and expensive to get wrong — the sentence a
// teacher reads when the software has failed them.

// Turns a provider error into something a teacher can act on.
//
// The raw text is written for whoever integrated the API, not for the person
// holding the deck: "This model does not support response format
// `json_schema`. See supported models at console.groq.com/..." told a physics
// teacher nothing except that the software was broken.
export function explainIngestFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");

  // BILLING IS CHECKED FIRST, and deliberately.
  //
  // A teacher uploaded a perfectly good .pptx and was told "Couldn't read
  // this file — please check it opens normally". The file was fine. The
  // account had run out of credit, and the provider said so in as many words:
  // "You have no credits remaining." Nothing here matched it, so it fell to
  // the default and the software blamed the teacher's PowerPoint for its own
  // unpaid bill. They re-exported the deck and tried again, which could never
  // have worked.
  //
  // Order matters as much as the branch. OpenAI's other way of saying this is
  // "You exceeded your current quota, please check your plan and billing
  // details" — which contains "quota" and so was caught below as a rate
  // limit, telling the teacher to try again in a minute, forever.
  //
  // Nobody at the school can fix this from the app, so the message names who
  // can instead of suggesting an action that cannot help.
  if (/no credits|insufficient[_ ]quota|exceeded your current quota|billing|payment required|past due/i.test(message)) {
    return "The school's AI service has run out of credit, so this deck could not be processed. Your file is fine and nothing was saved — this needs an administrator to top up the account before any upload will work.";
  }
  if (/rate[- ]?limit|too many requests|quota/i.test(message)) {
    return "The AI service is busy right now. Nothing was saved — please try this upload again in a minute.";
  }
  if (/json_schema|response format|structured output/i.test(message)) {
    return "The AI service returned an unusable response. Nothing was saved — please try again.";
  }
  if (/unsupported|corrupt|cannot parse|invalid file|not a valid|zip|password|encrypted/i.test(message)) {
    return "Couldn't read this file. Nothing was saved — please check it opens normally and try again.";
  }

  // The honest default.
  //
  // It used to be the sentence above, which asserts a cause this function has
  // not established. "Check it opens normally" sends a teacher to re-export a
  // file that was never the problem, and when that fails they conclude the
  // product is broken rather than that something is wrong behind it. Say what
  // is known — the deck did not get through — and point at the line that
  // carries the reason.
  return "This deck could not be processed. Nothing was saved — the details below say why, and are worth sending to whoever looks after this app.";
}

// A compact, safe version of the underlying error for the diagnostics line.
//
// Truncated because provider errors can carry long payload echoes, and
// bounded so nothing unexpected ends up rendered at length in a teacher's
// browser.
export function technicalDetail(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return message.replace(/\s+/g, " ").trim().slice(0, 300);
}
