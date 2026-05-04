// Minimal ABIs for the contracts the agent talks to.
export const REGISTRY_ABI = [
  "function register(string name, string endpoint)",
  "function update(string name, string endpoint)",
  "function deregister()",
  "function isRegistered(address) view returns (bool)",
  "function getAgent(address) view returns (tuple(address owner, string name, string endpoint, uint64 registeredAt, bool active))",
  "function totalAgents() view returns (uint256)",
  "function listAgents(uint256 offset, uint256 limit) view returns (tuple(address owner, string name, string endpoint, uint64 registeredAt, bool active)[])",
];

export const ROUTER_ABI = [
  "function deposit(bytes32 encAmount, bytes inputProof)",
  "function pay(address to, bytes32 encAmount, bytes inputProof)",
  "function withdrawAll()",
  "function settleExit(address agent, uint64 cleartextAmount, bytes decryptionProof)",
  "function balanceHandle(address) view returns (bytes32)",
  "function pendingExitHandle(address) view returns (bytes32)",
  "function hasPendingExit(address) view returns (bool)",
  "event Paid(address indexed from, address indexed to)",
  "event Deposited(address indexed agent)",
  "event ExitRequested(address indexed agent)",
  "event ExitSettled(address indexed agent, uint64 amount)",
];

export const CUSDT_ABI = [
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address holder, address spender) view returns (bool)",
  "function confidentialBalanceOf(address) view returns (bytes32)",
  "function wrap(address to, uint256 amount)",
  "function underlying() view returns (address)",
];

export const ERC20_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
