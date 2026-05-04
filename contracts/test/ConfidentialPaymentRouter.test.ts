import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

async function encrypt64(contract: string, user: string, amount: bigint) {
  const input = (hre as any).fhevm.createEncryptedInput(contract, user);
  input.add64(amount);
  return input.encrypt();
}

async function getBal(router: any, agent: any): Promise<bigint> {
  const handle = await router.balanceHandle(agent.address);
  if (handle === ethers.ZeroHash) return 0n;
  return await (hre as any).fhevm.userDecryptEuint(
    FhevmType.euint64,
    handle,
    await router.getAddress(),
    agent,
  );
}

describe("ConfidentialPaymentRouter", () => {
  async function deployAll() {
    const [deployer, alice, bob, eve] = await ethers.getSigners();

    const Reg = await ethers.getContractFactory("AgentRegistry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();

    const Mock = await ethers.getContractFactory("MockConfidentialUSDT");
    const cUSDT = await Mock.deploy();
    await cUSDT.waitForDeployment();

    const Router = await ethers.getContractFactory("ConfidentialPaymentRouter");
    const router = await Router.deploy(await cUSDT.getAddress(), await reg.getAddress());
    await router.waitForDeployment();

    await reg.connect(alice).register("Alice", "https://alice.example");
    await reg.connect(bob).register("Bob", "https://bob.example");

    await cUSDT.mint(alice.address, 1_000_000n);
    await cUSDT.mint(bob.address, 1_000_000n);

    const future = Math.floor(Date.now() / 1000) + 3600;
    await cUSDT.connect(alice).setOperator(await router.getAddress(), future);
    await cUSDT.connect(bob).setOperator(await router.getAddress(), future);

    return { reg, cUSDT, router, deployer, alice, bob, eve };
  }

  it("deposits credit encrypted balance", async () => {
    const { router, alice } = await deployAll();
    const enc = await encrypt64(await router.getAddress(), alice.address, 100n);
    await router.connect(alice).deposit(enc.handles[0], enc.inputProof);
    expect(await getBal(router, alice)).to.equal(100n);
  });

  it("pay: alice → bob updates both balances", async () => {
    const { router, alice, bob } = await deployAll();
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 100n);
      await router.connect(alice).deposit(e.handles[0], e.inputProof);
    }
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 30n);
      await router.connect(alice).pay(bob.address, e.handles[0], e.inputProof);
    }
    expect(await getBal(router, alice)).to.equal(70n);
    expect(await getBal(router, bob)).to.equal(30n);
  });

  it("pay > balance: branchless, transfers 0", async () => {
    const { router, alice, bob } = await deployAll();
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 50n);
      await router.connect(alice).deposit(e.handles[0], e.inputProof);
    }
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 999n);
      await router.connect(alice).pay(bob.address, e.handles[0], e.inputProof);
    }
    expect(await getBal(router, alice)).to.equal(50n);
    expect(await getBal(router, bob)).to.equal(0n);
  });

  it("pay rejects unregistered sender", async () => {
    const { router, eve, bob } = await deployAll();
    const e = await encrypt64(await router.getAddress(), eve.address, 1n);
    await expect(
      router.connect(eve).pay(bob.address, e.handles[0], e.inputProof),
    ).to.be.revertedWithCustomError(router, "NotRegistered");
  });

  it("pay rejects unregistered recipient", async () => {
    const { router, alice, eve } = await deployAll();
    const e = await encrypt64(await router.getAddress(), alice.address, 1n);
    await expect(
      router.connect(alice).pay(eve.address, e.handles[0], e.inputProof),
    ).to.be.revertedWithCustomError(router, "NotRegistered");
  });

  it("withdrawAll → publicDecrypt → settleExit zeroes balance + pays cUSDT", async () => {
    const { router, cUSDT, alice } = await deployAll();
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 250n);
      await router.connect(alice).deposit(e.handles[0], e.inputProof);
    }

    await router.connect(alice).withdrawAll();
    expect(await router.hasPendingExit(alice.address)).to.equal(true);

    const snapHandle = await router.pendingExitHandle(alice.address);
    const result = await (hre as any).fhevm.publicDecrypt([snapHandle]);
    const cleartext: bigint = BigInt(result.clearValues[snapHandle as string]);
    const proof: string = result.decryptionProof;

    await router.connect(alice).settleExit(alice.address, cleartext, proof);

    expect(await router.hasPendingExit(alice.address)).to.equal(false);
    expect(await getBal(router, alice)).to.equal(0n);

    // Mock cUSDT should now report alice's confidential balance back at the original 1_000_000.
    // (We deposited 250 and exited 250.)
    const cusdtHandle = await cUSDT.confidentialBalanceOf(alice.address);
    const aliceCusdt = await (hre as any).fhevm.userDecryptEuint(
      FhevmType.euint64,
      cusdtHandle,
      await cUSDT.getAddress(),
      alice,
    );
    expect(aliceCusdt).to.equal(1_000_000n);
  });

  it("withdrawAll twice without settling reverts", async () => {
    const { router, alice } = await deployAll();
    {
      const e = await encrypt64(await router.getAddress(), alice.address, 10n);
      await router.connect(alice).deposit(e.handles[0], e.inputProof);
    }
    await router.connect(alice).withdrawAll();
    await expect(router.connect(alice).withdrawAll()).to.be.revertedWithCustomError(
      router,
      "PendingExitInProgress",
    );
  });
});
