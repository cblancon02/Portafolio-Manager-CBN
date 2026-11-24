/** Vercel Serverless Function Entrypoint (CommonJS -> ESM bridge) */
let entryPromise = null;

module.exports = async function handler(req, res) {
  if (!entryPromise) {
    entryPromise = import('../server/vercel-entry.mjs');
  }
  const mod = await entryPromise;
  return mod.default(req, res);
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
