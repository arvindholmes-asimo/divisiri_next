// Runs once at server start: a misconfigured server must not serve requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrExit } = await import("./lib/startup");
    validateEnvOrExit();
  }
}
