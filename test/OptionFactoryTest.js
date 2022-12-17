const Utils = require("./Utils.js");
const TokenMock = artifacts.require('./utils/TokenMock.sol');
const OptionToken = artifacts.require('./OptionToken.sol');
const OptionFactory = artifacts.require('./OptionFactory.sol');
const DexBrokerage = artifacts.require('./DexBrokerage.sol');

let owner;
let alex;

let dexbToken;
let factory;
let mockToken;
let etherAddress = '0x0000000000000000000000000000000000000000';
let oneEther = Math.pow(10, 18);
let initialDexbTreshold = 5 * Math.pow(10, 18);
let oneFinney = web3.toWei(1, "finney");
let twoFinney = web3.toWei(2, "finney");
let oneQuarterEther = web3.toWei(0.25, "ether");

let makerFee = oneFinney;
let takerFee = twoFinney;

let minIssueAmount = 0;
const inactivityReleasePeriod = 20000;

contract('OptionFactory', (accounts) => {

    beforeEach(async () => {
        owner      = accounts[0];
        alex       = accounts[1];
        feeAccount = accounts[2];
        admin      = accounts[3];
        adminBob   = accounts[4]; 

        dexbToken = await TokenMock.new('Dex Brokerage', 'DEXB', 18);
        mockToken = await TokenMock.new('Second Token', 'Second', 12);

        tokenUSD = await TokenMock.new('USD', 'DexbToken', 18);

        exchange = await DexBrokerage.new(makerFee, takerFee, feeAccount, inactivityReleasePeriod);

        factory = await OptionFactory.new(dexbToken.address, initialDexbTreshold, exchange.address, {from: owner});
        
        await factory.setAdmin(admin, true, {from: owner});
    });

    it("Makes sure single instance of option is created.", async() => {
        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let firstToken = etherAddress;
        let secondToken = mockToken.address;
        let strikePrice = 15 * Math.pow(10, 12);
        let isCall = true;
        let decimals = 18;

        // 1. OptionsToken should not exists at the begining.
        let result = await factory.getOptionAddress.call(
            expiryDate, firstToken, secondToken, strikePrice, isCall, decimals);

        // Result should be zero address;
        assert.equal(etherAddress, result);

        // 2. Create OptionToken.
        await factory.createOption(expiryDate, firstToken, secondToken, 
            minIssueAmount, strikePrice, isCall, decimals, "Coin");

        // 3. OptionToken should exists.
        let optionTokenAddress = await factory.getOptionAddress.call(
            expiryDate, firstToken, secondToken, strikePrice, isCall, decimals);

        // Result should not be zero address;
        assert.notEqual(etherAddress, optionTokenAddress);

        // Behaves like OptionToken
        let optionToken = OptionToken.at(optionTokenAddress);
        await optionToken.issueWithWei({value: oneEther, from: alex});
        let balance = (await optionToken.balanceOf(alex)).toNumber();
        assert.equal(balance, 0.997 * oneEther);

        // 4. Cannot create the same OptionToken again.
        await Utils.expectRevert(async () => {
            await factory.createOption(expiryDate, firstToken, secondToken, 
                minIssueAmount, strikePrice, isCall, decimals, "Coin");
        });
    });

    it("Should be able to set Admin", async () => {
        // 1. Owner can set admin
        await factory.setAdmin(adminBob, true, {from: owner});
        assert.equal(await factory.admins(adminBob), true);
    });

    it("Should be ownable", async () => {
        // 1. Creator is owner.
        assert.equal(owner, await factory.owner.call());

        // 2. Owner can transfer onwership.
        await factory.transferOwnership(alex);
        assert.equal(alex, await factory.owner.call());

        // 3. Only current onwer (alex) can transfer onwership.
        await Utils.expectRevert(async () => {
            await factory.transferOwnership(alex, {from: owner});
        }); 
    });

    async function adjustFeeScenario(feeSetterFn, feeGetterFn){
        // 0.9% fee;
        let fee = 900;

        // 0. Make sure initial value is different then fee, so we test something.
        assert.notEqual(fee, (await feeGetterFn()).toNumber());

        // 1. Set fee. Confirm admin and owner can set fee
        await feeSetterFn(fee, {from: admin});
        await feeSetterFn(fee, {from: owner});

        // 2. Check fee.
        assert.equal(fee, (await feeGetterFn()).toNumber());

        // 3. Only onwer can change fee.
        await Utils.expectRevert(async () => {
            await feeSetterFn(123, {from: alex});
        });

        // 4. It should not be possible to set fee to more then 1%.
        await Utils.expectRevert(async () => {
            await feeSetterFn(1001, {from: owner});
        });
    }

    it("Should be possible to adjust issue fee", async () => {
        await adjustFeeScenario(factory.setIssueFee, factory.issueFee);
    });

    it("Should be possible to adjust issue fee for DEXB holders", async () => {
        await adjustFeeScenario(factory.setDexbIssueFee, factory.dexbIssueFee);
    });

    it("Should be possible to adjust execute fee", async () => {
        await adjustFeeScenario(factory.setExecuteFee, factory.executeFee);
    });

    it("Should be possible to adjust execute fee for DEXB holders", async () => {
        await adjustFeeScenario(factory.setDexbExecuteFee, factory.dexbExecuteFee);
    });

    it("Should be possible to adjust cancel fee", async () => {
        await adjustFeeScenario(factory.setCancelFee, factory.cancelFee);
    });

    it("Should be possible to adjust cancel fee for DEXB holders", async () => {
        await adjustFeeScenario(factory.setDexbCancelFee, factory.dexbCancelFee);
    });

    async function differentFeeForDexbHoldersScenario(setFeeFn, setHolderFeeFn, feeCalcFn) {
        // Normal fee - 0.4% 
        let fee = 400;
        // Holder fee - 0.15 %
        let holderFee = 150;

        // 1. Set fee
        await setFeeFn(fee);
        await setHolderFeeFn(holderFee);

        let value = Math.pow(10, 6);

        // 2. Fee for user with dexb below treshold should be `fee`.
        assert.isBelow((await dexbToken.balanceOf(alex)).toNumber(), initialDexbTreshold);
        assert.equal(value * fee / 100000, (await feeCalcFn.call(alex, value)).toNumber());

        // 3. Fee for user with dexb equal treshold should be `holderFee`.
        await dexbToken.mint(alex, initialDexbTreshold);
        assert.equal((await dexbToken.balanceOf(alex)).toNumber(), initialDexbTreshold);
        assert.equal(value * holderFee / 100000, (await feeCalcFn.call(alex, value)).toNumber());

        // 3. Fee for user with dexb above treshold should be `holderFee`.
        await dexbToken.mint(alex, initialDexbTreshold);
        assert.equal((await dexbToken.balanceOf(alex)).toNumber(), 2 * initialDexbTreshold);
        assert.equal(value * holderFee / 100000, (await feeCalcFn.call(alex, value)).toNumber());
    }

    it("Should have different issue fee for DEXB holders.", async () => {
        await differentFeeForDexbHoldersScenario(
            factory.setIssueFee, factory.setDexbIssueFee, factory.calcIssueFeeAmount
        );
    });

    it("Should have different execute fee for DEXB holders.", async () => {
        await differentFeeForDexbHoldersScenario(
            factory.setExecuteFee, factory.setDexbExecuteFee, factory.calcExecuteFeeAmount
        );
    })

    it("Should have different cancel fee for DEXB holders.", async () => {
        await differentFeeForDexbHoldersScenario(
            factory.setCancelFee, factory.setDexbCancelFee, factory.calcCancelFeeAmount
        );
    })

    async function differentFeeForDexbHoldersScenarioOnExchange(setFeeFn, setHolderFeeFn, feeCalcFn) {
        // Normal fee - 0.4% 
        let fee = 400;
        // Holder fee - 0.15 %
        let holderFee = 150;

        // 1. Set fee
        await setFeeFn(fee);
        await setHolderFeeFn(holderFee);

        let value = Math.pow(10, 6);

        // 2. Fee for user with dexb below treshold should be `fee`.
        assert.isBelow((await dexbToken.balanceOf(alex)).toNumber(), initialDexbTreshold);
        assert.equal(value * fee / 100000, (await feeCalcFn.call(alex, value)).toNumber());

        // 3. Fee for user with dexb equal treshold should be `holderFee`.
        await dexbToken.mint(alex, initialDexbTreshold/2);
        await dexbToken.mint(alex, initialDexbTreshold/2);
        await dexbToken.approve(exchange.address, initialDexbTreshold/2, {from: alex});
        await exchange.depositToken(dexbToken.address, initialDexbTreshold/2, {from: alex});

        assert.equal((await exchange.balanceOf(dexbToken.address, alex)).toNumber(), initialDexbTreshold/2);
        assert.equal((await dexbToken.balanceOf(alex)).toNumber(), initialDexbTreshold/2);
        assert.equal(value * holderFee / 100000, (await feeCalcFn.call(alex, value)).toNumber());

        // 3. Fee for user with dexb above treshold should be `holderFee`.
        await dexbToken.mint(alex, initialDexbTreshold);
        await dexbToken.approve(exchange.address, initialDexbTreshold, {from: alex});
        await exchange.depositToken(dexbToken.address, initialDexbTreshold, {from: alex});
        assert.equal((await exchange.balanceOf(dexbToken.address, alex)).toNumber(), 1.5 * initialDexbTreshold);
        assert.equal(value * holderFee / 100000, (await feeCalcFn.call(alex, value)).toNumber());
    }

    it("Should have different issue fee for DEXB holders on Exchange.", async () => {
        await differentFeeForDexbHoldersScenarioOnExchange(
            factory.setIssueFee, factory.setDexbIssueFee, factory.calcIssueFeeAmount
        );
    });

    it("Should have different execute fee for DEXB holders on Exchange.", async () => {
        await differentFeeForDexbHoldersScenarioOnExchange(
            factory.setExecuteFee, factory.setDexbExecuteFee, factory.calcExecuteFeeAmount
        );
    })

    it("Should have different cancel fee for DEXB holders on Exchange.", async () => {
        await differentFeeForDexbHoldersScenarioOnExchange(
            factory.setCancelFee, factory.setDexbCancelFee, factory.calcCancelFeeAmount
        );
    })
});

