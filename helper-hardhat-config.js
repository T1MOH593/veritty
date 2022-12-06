const networkConfig = {
    31337: {
        name: "localhost",
        entranceFee: "5900000000000",
        tokensLeftByTokenId: [1, 3, 6, 10, 15, 25, 40, 60, 110, 210, 910, 10000],
        keyHash: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "200000",
    },
    5: {
        name: "goerli",
        entranceFee: "590000000000000",
        tokensLeftByTokenId: [1, 3, 6, 10, 15, 25, 40, 60, 110, 210, 910, 10000],
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        subscriptionId: "",
        keyHash: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "200000"
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
}
