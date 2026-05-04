import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentRegistry", () => {
  async function deploy() {
    const [deployer, alice, bob, carol] = await ethers.getSigners();
    const Reg = await ethers.getContractFactory("AgentRegistry");
    const reg = await Reg.deploy();
    await reg.waitForDeployment();
    return { reg, deployer, alice, bob, carol };
  }

  it("registers + reads back metadata", async () => {
    const { reg, alice } = await deploy();
    await reg.connect(alice).register("Alice-Bot", "https://alice.example/.well-known/agent");

    expect(await reg.isRegistered(alice.address)).to.equal(true);
    const a = await reg.getAgent(alice.address);
    expect(a.owner).to.equal(alice.address);
    expect(a.name).to.equal("Alice-Bot");
    expect(a.endpoint).to.equal("https://alice.example/.well-known/agent");
    expect(a.active).to.equal(true);
    expect(await reg.totalAgents()).to.equal(1n);
  });

  it("reverts on double register", async () => {
    const { reg, alice } = await deploy();
    await reg.connect(alice).register("A", "u");
    await expect(reg.connect(alice).register("A2", "u2")).to.be.revertedWithCustomError(reg, "AlreadyRegistered");
  });

  it("validates name + endpoint length", async () => {
    const { reg, alice } = await deploy();
    await expect(reg.connect(alice).register("", "u")).to.be.revertedWithCustomError(reg, "InvalidName");
    await expect(reg.connect(alice).register("A", "")).to.be.revertedWithCustomError(reg, "InvalidEndpoint");
    await expect(reg.connect(alice).register("x".repeat(65), "u")).to.be.revertedWithCustomError(reg, "InvalidName");
    await expect(reg.connect(alice).register("A", "x".repeat(257))).to.be.revertedWithCustomError(
      reg,
      "InvalidEndpoint"
    );
  });

  it("update changes name + endpoint", async () => {
    const { reg, alice } = await deploy();
    await reg.connect(alice).register("A", "u1");
    await reg.connect(alice).update("A2", "u2");
    const a = await reg.getAgent(alice.address);
    expect(a.name).to.equal("A2");
    expect(a.endpoint).to.equal("u2");
  });

  it("deregister: removes + compacts list (swap-and-pop)", async () => {
    const { reg, alice, bob, carol } = await deploy();
    await reg.connect(alice).register("A", "u");
    await reg.connect(bob).register("B", "u");
    await reg.connect(carol).register("C", "u");

    await reg.connect(bob).deregister();
    expect(await reg.isRegistered(bob.address)).to.equal(false);
    expect(await reg.totalAgents()).to.equal(2n);

    const page = await reg.listAgents(0, 10);
    const owners = page.map((p: any) => p.owner);
    expect(owners).to.have.members([alice.address, carol.address]);
  });

  it("paginates listAgents", async () => {
    const { reg } = await deploy();
    const signers = await ethers.getSigners();
    for (let i = 0; i < 5; ++i) {
      await reg.connect(signers[i]).register(`a${i}`, `u${i}`);
    }
    const p1 = await reg.listAgents(0, 2);
    const p2 = await reg.listAgents(2, 2);
    const p3 = await reg.listAgents(4, 10);
    expect(p1.length).to.equal(2);
    expect(p2.length).to.equal(2);
    expect(p3.length).to.equal(1);
  });
});
