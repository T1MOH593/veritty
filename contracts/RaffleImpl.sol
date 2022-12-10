// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./interfaces/Raffle.sol";
import "hardhat/console.sol";

contract RaffleImpl is ERC1155, VRFConsumerBaseV2, Ownable, Raffle {
    string private baseUri = "";

    /* Raffle Variables */
    uint256 public entranceFee;
    uint256 public positionsLeft;
    // requestId => player
    mapping(uint256 => address) public addressByRequestId;
    // Minter => tokenId => tokenAmount
    mapping(address => mapping(uint256 => uint256)) public allowedMint;
    uint256[] private tokensLeftByTokenId;

    /* Chainlink Variables */
    address public vrfCoordinatorV2;
    uint64 private subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    constructor(
        uint256 _entranceFee,
        uint256[] memory _tokensLeftByTokenId,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) ERC1155("") VRFConsumerBaseV2(_vrfCoordinator) {
        entranceFee = _entranceFee;
        positionsLeft = _tokensLeftByTokenId[_tokensLeftByTokenId.length - 1];
        tokensLeftByTokenId = _tokensLeftByTokenId;

        vrfCoordinatorV2 = _vrfCoordinator;
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
    }

    function enterRaffle() external payable {
        require(msg.value >= entranceFee, "Raffle: not enough ether sent");
        require(positionsLeft > 0, "Raffle: All positiions are closed");
        uint256 requestId = VRFCoordinatorV2Interface(vrfCoordinatorV2).requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );
        positionsLeft -= 1;
        addressByRequestId[requestId] = msg.sender;
        emit EnteredRaffle(msg.sender, requestId, positionsLeft);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        uint256 openPositionsLeft = tokensLeftByTokenId[tokensLeftByTokenId.length - 1];
        uint256 randomNumber = randomWords[0] % openPositionsLeft;

        uint256 length = tokensLeftByTokenId.length;
        uint256 tokenIdWinner = tokensLeftByTokenId.length - 1;
        // choose prize
        // I use int256 because value can be negative
        for (int256 i = int256(length) - 2; i >= 0; i--) {
            if (i < 0) {
                break;
            }
            if (tokensLeftByTokenId[uint256(i)] > randomNumber) {
                tokenIdWinner = uint256(i);
            }
        }
        // update prizes
        // I use int256 because value can be negative
        for (int256 i = int256(length) - 1; i >= 0 && uint256(i) >= tokenIdWinner; i--) {
            tokensLeftByTokenId[uint256(i)] -= 1;
        }

        // allow mint to winner
        address player = addressByRequestId[requestId];
        bool isWinner;
        if (tokenIdWinner != length - 1) {
            // if user won prize
            allowedMint[player][tokenIdWinner] += 1;
            isWinner = true;
        }
        emit WinnerChosen(player, isWinner, tokenIdWinner);
    }

    function mint(uint256 tokenId, uint256 amount) external {
        require(allowedMint[msg.sender][tokenId] > 0, "Raffle: Amount to mint is zero");

        if (allowedMint[msg.sender][tokenId] >= amount) {
            _mint(msg.sender, tokenId, amount, "");
        }
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseUri, tokenId, ".json"));
    }

    function getTokensLeftByTokenId(uint256 index) external view returns (uint256) {
        if (index == 0) {
            return tokensLeftByTokenId[0];
        }
        return tokensLeftByTokenId[index] - tokensLeftByTokenId[index - 1];
    }
}
