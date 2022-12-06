const { assert, expect } = require("chai")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

const entranceAmount = ethers.utils.parseEther("0.0000059")
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RaffleImpl", function () {
        let raffle, deployer, vrfCoordinatorV2Mock

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["mocks", "raffleImpl"])
            raffle = await ethers.getContract("RaffleImpl", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")

            await vrfCoordinatorV2Mock.addConsumer(1, raffle.address)
        })
        describe("constructor", function () {
            const chainId = network.config.chainId
            it("vrfCoordinatorV2", async () => {
                assert(await raffle.vrfCoordinatorV2(), vrfCoordinatorV2Mock.address)
            })
            it("keyHash", async () => {
                assert(await raffle.keyHash(), networkConfig[chainId]["keyHash"])
            })
            it("callbackGasLimit", async () => {
                assert(await raffle.callbackGasLimit(), networkConfig[chainId]["callbackGasLimit"])
            })
            it("entranceFee", async () => {
                assert(await raffle.entranceFee(), networkConfig[chainId]["entranceFee"])
            })
            it("tokensLeftByTokenId", async () => {
                const tokensLeftArray = networkConfig[chainId]["tokensLeftByTokenId"]
                assert.equal((await raffle.getTokensLeftByTokenId(0)).toString(),
                    ethers.BigNumber.from(tokensLeftArray[0]).toString())
                for (let i = 1; i < tokensLeftArray.length; i++) {
                    assert.equal((await raffle.getTokensLeftByTokenId(i)).toString(),
                        ethers.BigNumber.from(tokensLeftArray[i]).sub(tokensLeftArray[i - 1]).toString())
                }
            })
        })
        describe("enterRaffle", function () {
            it("revert when you don't pay enough", async () => {
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle: not enough ether sent")
            })
            it("emits event EnteredRaffle", async () => {
                const txResponse = await raffle.enterRaffle({ value: entranceAmount })
                const txReceipt = await txResponse.wait(1)
                const positionsLeft = await raffle.positionsLeft()
                await expect(await raffle.enterRaffle({ value: entranceAmount })).to.emit(raffle, "EnteredRaffle")
            })
            it("sets requestId to player", async () => {
                const txResponse = await raffle.enterRaffle({ value: entranceAmount })
                const txReceipt = await txResponse.wait(1)
                const requestId = txReceipt.events[1].args.requestId

                assert.equal((await raffle.addressByRequestId(requestId)), deployer)
            })
        })
        describe("fulfillRandomWords", function () {
            let requestIds = []
            beforeEach(async () => {
                for (let i = 0; i < 10; i++) {
                    let txResponse = await raffle.enterRaffle({ value: entranceAmount })
                    let txReceipt = await txResponse.wait(1)
                    requestIds.push(txReceipt.events[1].args.requestId)
                }
            })
            it("emits event WinnerChosen", async () => {
                await expect(await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[0], raffle.address, [1])).to.emit(raffle, "WinnerChosen")
                    .withArgs(deployer, true, 1)
            })
            it("reduces amount of available tokens on 1", async () => {
                const tokensLeft = await raffle.getTokensLeftByTokenId(0);
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[0], raffle.address, [0])
                assert.equal((await raffle.getTokensLeftByTokenId(0)).toString(), tokensLeft.sub(1).toString())
            })
            it("correctly takes next tokenId when picked is run out", async () => {
                const tokensLeft0 = await raffle.getTokensLeftByTokenId(0);
                const tokensLeft1 = await raffle.getTokensLeftByTokenId(1);
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[0], raffle.address, [0])
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[1], raffle.address, [0])
                assert.equal((await raffle.getTokensLeftByTokenId(0)).toString(), tokensLeft0.sub(1).toString())
                assert.equal((await raffle.getTokensLeftByTokenId(1)).toString(), tokensLeft1.sub(1).toString())
            })
            it("allows mint to winner", async () => {
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[0], raffle.address, [1])
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(requestIds[1], raffle.address, [1])
                assert.equal(await raffle.allowedMint(deployer, 1), 2)
            })
        })
        describe("mint", function () {
            it("reverts on not allowed mint", async () => {
                await expect(raffle.mint(1, 1)).to.be.revertedWith("Raffle: Amount to mint is zero")
            })
            it("mints correctly", async () => {
                await raffle.enterRaffle({ value: entranceAmount })
                await vrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(1, raffle.address, [1])
                const tokenId = 1

                await raffle.mint(1, 1)

                assert.equal(await raffle.balanceOf(deployer, 1), 1)
            })
        })
    })