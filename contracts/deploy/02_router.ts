import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const SEPOLIA_CUSDT = process.env.CUSDT_SEPOLIA ?? "0x4E7B06D78965594eB5EF5414c357ca21E1554491";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy, get, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const registry = await get("AgentRegistry");

  let cUSDT: string;
  if (network.name === "sepolia") {
    cUSDT = SEPOLIA_CUSDT;
    log(`Using live cUSDT at ${cUSDT}`);
  } else {
    const mock = await deploy("MockConfidentialUSDT", {
      from: deployer,
      args: [],
      log: true,
    });
    cUSDT = mock.address;
    log(`Deployed MockConfidentialUSDT at ${cUSDT}`);
  }

  const router = await deploy("ConfidentialPaymentRouter", {
    from: deployer,
    args: [cUSDT, registry.address],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 2 : 1,
  });

  log(`ConfidentialPaymentRouter deployed at ${router.address}`);
};

export default func;
func.tags = ["Router"];
func.dependencies = ["AgentRegistry"];
