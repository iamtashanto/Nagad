import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  createNagad,
  NodeCryptoProvider,
  PureJsCryptoProvider,
  NagadCryptoCapabilityError,
} from "../src/index.js";
import {
  generateSimulatorKeys,
  createNagadSimulator,
  NagadSimulator,
} from "nagad-simulator";

describe("default crypto provider falls back to pure-JS decryption", () => {
  let simulator: NagadSimulator;
  let url = "";
  const keys = generateSimulatorKeys();
  beforeAll(async () => {
    simulator = createNagadSimulator(keys);
    url = (await simulator.start(0)).url;
  });
  afterAll(async () => {
    await simulator.stop();
  });
  afterEach(() => vi.restoreAllMocks());

  const config = () => ({
    merchantId: "MERC12345678901",
    merchantPrivateKey: keys.merchant.privateKey,
    pgPublicKey: keys.pg.publicKey,
    baseUrl: url,
  });

  it("switches to the pure-JS provider when node:crypto cannot decrypt PKCS#1 v1.5", async () => {
    vi.spyOn(NodeCryptoProvider.prototype, "checkCapability").mockRejectedValue(
      new NagadCryptoCapabilityError("simulated OpenSSL 3.0 restriction"),
    );
    vi.spyOn(
      NodeCryptoProvider.prototype,
      "decryptWithPrivateKey",
    ).mockRejectedValue(new Error("must not be used"));
    const nagad = createNagad(config());
    const created = await nagad.checkout.create({
      amount: "50.00",
      callbackUrl: "https://shop.example/cb",
    });
    const result = await nagad.checkout.verify({
      paymentRefId: created.paymentReferenceId,
      expectedAmount: "50.00",
    });
    expect(result.success).toBe(true);
    expect(nagad.crypto).toBeInstanceOf(PureJsCryptoProvider);
  });

  it("never replaces a provider you configured", async () => {
    const custom = new NodeCryptoProvider();
    vi.spyOn(custom, "checkCapability").mockRejectedValue(
      new NagadCryptoCapabilityError("simulated"),
    );
    const nagad = createNagad({ ...config(), cryptoProvider: custom });
    await expect(nagad.init()).rejects.toBeInstanceOf(
      NagadCryptoCapabilityError,
    );
    expect(nagad.crypto).toBe(custom);
  });
});
