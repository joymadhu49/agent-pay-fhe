// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

/// @title AgentRegistry
/// @notice Public registry of AI agents identified by EOA. Metadata is intentionally
///         public so peers can discover endpoints; payment amounts stay encrypted in
///         {ConfidentialPaymentRouter}.
contract AgentRegistry {
    struct Agent {
        address owner;
        string name;
        string endpoint;
        uint64 registeredAt;
        bool active;
    }

    mapping(address => Agent) private _agents;
    address[] private _addresses;
    mapping(address => uint256) private _idxPlusOne;

    event AgentRegistered(address indexed owner, string name, string endpoint);
    event AgentUpdated(address indexed owner, string name, string endpoint);
    event AgentDeregistered(address indexed owner);

    error AlreadyRegistered();
    error NotRegistered();
    error InvalidName();
    error InvalidEndpoint();
    error PaginationOutOfRange();

    function register(string calldata name_, string calldata endpoint_) external {
        if (_idxPlusOne[msg.sender] != 0) revert AlreadyRegistered();
        _validate(name_, endpoint_);

        _addresses.push(msg.sender);
        _idxPlusOne[msg.sender] = _addresses.length;
        _agents[msg.sender] = Agent({
            owner: msg.sender,
            name: name_,
            endpoint: endpoint_,
            registeredAt: uint64(block.timestamp),
            active: true
        });

        emit AgentRegistered(msg.sender, name_, endpoint_);
    }

    function update(string calldata name_, string calldata endpoint_) external {
        if (_idxPlusOne[msg.sender] == 0) revert NotRegistered();
        _validate(name_, endpoint_);

        Agent storage a = _agents[msg.sender];
        a.name = name_;
        a.endpoint = endpoint_;
        a.active = true;

        emit AgentUpdated(msg.sender, name_, endpoint_);
    }

    function deregister() external {
        uint256 idxPlusOne = _idxPlusOne[msg.sender];
        if (idxPlusOne == 0) revert NotRegistered();

        uint256 idx = idxPlusOne - 1;
        uint256 last = _addresses.length - 1;
        if (idx != last) {
            address moved = _addresses[last];
            _addresses[idx] = moved;
            _idxPlusOne[moved] = idx + 1;
        }
        _addresses.pop();
        delete _idxPlusOne[msg.sender];
        delete _agents[msg.sender];

        emit AgentDeregistered(msg.sender);
    }

    function isRegistered(address a) external view returns (bool) {
        return _idxPlusOne[a] != 0;
    }

    function getAgent(address a) external view returns (Agent memory) {
        if (_idxPlusOne[a] == 0) revert NotRegistered();
        return _agents[a];
    }

    function totalAgents() external view returns (uint256) {
        return _addresses.length;
    }

    function listAgents(uint256 offset, uint256 limit) external view returns (Agent[] memory page) {
        uint256 total = _addresses.length;
        if (offset > total) revert PaginationOutOfRange();
        uint256 end = offset + limit;
        if (end > total) end = total;
        page = new Agent[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            page[i - offset] = _agents[_addresses[i]];
        }
    }

    function _validate(string calldata name_, string calldata endpoint_) internal pure {
        uint256 nlen = bytes(name_).length;
        uint256 elen = bytes(endpoint_).length;
        if (nlen == 0 || nlen > 64) revert InvalidName();
        if (elen == 0 || elen > 256) revert InvalidEndpoint();
    }
}
