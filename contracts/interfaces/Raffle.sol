// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface Raffle {
    event EnteredRaffle(address indexed player, uint256 indexed requestId, uint256 positionsLeft);
    event WinnerChosen(address indexed player, bool indexed isWinner, uint256 indexed allowedTokenIdToMint);

    function enterRaffle() external payable;

    function mint(uint256 tokenId, uint256 amount) external;
}
