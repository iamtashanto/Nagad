// Full create + verify against the local simulator using the BUILT packages and the default
// crypto provider. Used to check runtimes that vitest cannot run on (for example Node 18).
//   pnpm build && npx -y node@18 scripts/smoke-checkout.mjs
import { createNagad } from "../packages/nagad-server/dist/index.js";
import {
  createNagadSimulator,
  generateSimulatorKeys,
} from "../packages/nagad-simulator/dist/index.js";

const keys = generateSimulatorKeys();
const simulator = createNagadSimulator(keys);
const { url } = await simulator.start(0);
try {
  const nagad = createNagad({
    merchantId: "MERC12345678901",
    merchantPrivateKey: keys.merchant.privateKey,
    pgPublicKey: keys.pg.publicKey,
    baseUrl: url,
  });
  const created = await nagad.checkout.create({
    amount: "200.00",
    callbackUrl: "https://shop.example/cb",
  });
  const result = await nagad.checkout.verify({
    paymentRefId: created.paymentReferenceId,
    expectedAmount: "200.00",
  });
  if (!result.success) throw new Error("verify did not succeed");
  console.log(
    `${process.version}: create + verify OK (${nagad.crypto.constructor.name})`,
  );
} finally {
  await simulator.stop();
}
