var BigNumber = require('bignumber.js');

const Utils = require("./Utils.js");
const TokenMock = artifacts.require('./utils/TokenMock.sol');
const OptionToken = artifacts.require('./OptionToken.sol');
const OptionFactory = artifacts.require('./OptionFactory');
const DexBrokerage = artifacts.require('./DexBrokerage.sol');

let etherAddress = '0x0000000000000000000000000000000000000000';

let owner;
let alex;
let bob;
let charlie;

let factory;

let issueFee    = 100 // 0.1%
let executeFee  = 200 // 0.2%
let cancelFee   = 300 // 0.3%
let a100percent = 100000 // 100%

let oneEther = Math.pow(10, 18);
let twoEther = web3.toWei(2, "ether");
let allowedEtherDelta = 1 * Math.pow(10, 14);

let oneFinney = web3.toWei(1, "finney");
let twoFinney = web3.toWei(2, "finney");

let initialDexbTreshold = 5 * Math.pow(10, 18);
let makerFee = oneFinney;
let takerFee = twoFinney;

let minIssueAmount = 0;
const inactivityReleasePeriod = 20000;

contract('OptionToken', (accounts) => {

    beforeEach(async () => {
        owner      = accounts[0];
        alex       = accounts[1];
        bob        = accounts[2];
        charlie    = accounts[3];
        feeAccount = accounts[4];
        admin      = accounts[5];

        dexbToken = await TokenMock.new('DEXB', 'DexbToken', 18);
        tokenUSD = await TokenMock.new('USD', 'DexbToken', 18);

        exchange = await DexBrokerage.new(makerFee, takerFee, feeAccount, inactivityReleasePeriod);

        factory = await OptionFactory.new(dexbToken.address, initialDexbTreshold, exchange.address, {from: owner});
        await factory.setAdmin(admin, true, {from: owner});
        await factory.setAdmin(owner, true, {from: owner});
        await factory.setIssueFee(issueFee);
        await factory.setExecuteFee(executeFee);
        await factory.setCancelFee(cancelFee);
    });

    it("tokenToTokenCall admin can set minimum issue size", async () => {
        let firstTokenDecimals = 18;
        let secondTokenDecimals = 18;
        let strikePrice = 100;

        let firstToken  = await TokenMock.new('First Token',  'First',  firstTokenDecimals);
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneFirstToken  = Math.pow(10, firstTokenDecimals);
        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneFirstToken;

        await firstToken.mint(alex, oneFirstToken);
        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, firstToken.address, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, true, "OptionToken", firstTokenDecimals);

        // 1. Set minimum issue amount to two tokens
        await optionToken.setMinIssueAmount(twoEther, {from: admin});

        // 2. Random person cannot change min issue amount
        await Utils.expectRevert(async () => {
            await optionToken.setMinIssueAmount(oneEther, {from: charlie});
        });

        // 3. Issue tokens
        await firstToken.approve(optionToken.address, oneFirstToken, {from: alex});

        // 4. Must have greater than minimum issue size
        await Utils.expectRevert(async () => {
            await optionToken.issueWithToken(oneOptionToken, {from: alex});
        });

        // 5. Create enough Token to pass threshold;
        await firstToken.mint(alex, oneFirstToken);
        await firstToken.increaseApproval(optionToken.address, oneFirstToken, {from: alex});

        // 6. Issue token
        await optionToken.issueWithToken(twoEther, {from: alex});

        await optionToken.approveAndDeposit(exchange.address, oneFirstToken, {from: alex});
        assert(oneEther == (await exchange.balanceOf(optionToken.address, alex)).toNumber(), "token deposit works correctly");

    });

    it("etherToTokenCall owner can set minimum issue size", async () => {
        let secondTokenDecimals = 18;
        let strikePrice = 100;
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneEther;

        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, etherAddress, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, true, "OptionToken", 18);

        // 1. Issue tokens
        let ownersEther = (await web3.eth.getBalance(owner)).toNumber();

        // 2. Set minimum issue amount to two tokens
        await optionToken.setMinIssueAmount(twoEther, {from: owner});

        // 3. Must have greater than minimum issue size
        await Utils.expectRevert(async () => {
                await optionToken.issueWithWei({value: oneEther, from: alex});
        });
        // 4. Issue enough to pass threshold;
        await optionToken.issueWithWei({value: twoEther, from: alex});
    });
    
    async function tokenToTokenCall(firstTokenDecimals, secondTokenDecimals, strikePrice){
        let firstToken  = await TokenMock.new('First Token',  'First',  firstTokenDecimals);
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneFirstToken  = Math.pow(10, firstTokenDecimals);
        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneFirstToken;

        await firstToken.mint(alex, oneFirstToken);
        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, firstToken.address, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, true, "OptionToken", firstTokenDecimals);

        // 1. Issue tokens
        await firstToken.approve(optionToken.address, oneFirstToken, {from: alex});
        await optionToken.issueWithToken(oneOptionToken, {from: alex});

        // Alex has 0 First Tokens.
        assert.equal(0, (await firstToken.balanceOf(alex)).toNumber());
        // Alex has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.999 First Token.
        assert.equal(0.999 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.001 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(bob, 0.75 * oneOptionToken, {from: alex});
        await secondToken.approve(optionToken.address, 0.75 * realStrikePrice, {from: bob});
        await optionToken.executeWithToken(0.75 * oneOptionToken, {from: bob});

        // Alex has 0.75 * `strikePrice` Second Tokens.
        assert.equal(0.75 * realStrikePrice, (await secondToken.balanceOf(alex)).toNumber());
        // Bob has 0.7485 First Token.
        assert.equal(0.7485 * oneFirstToken, (await firstToken.balanceOf(bob)).toNumber());
        // Bob has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.249 First Token.
        assert.equal(0.249 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0025 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 3. Cancel issued tokens.
        await optionToken.cancel(0.2 * oneOptionToken, {from: alex});

        // Alex has 0.1994 First Tokens.
        assert.equal(0.1994 * oneFirstToken, (await firstToken.balanceOf(alex)).toNumber());
        // Alex has 0.049 Option Tokens.
        assert.equal(0.049 * oneOptionToken, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.049 First Token.
        assert.equal(0.049 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0031 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);

        await optionToken.refund({from: charlie});

        // Alex has 0.1994 + 0.049 First Tokens.
        assert.equal(0.2484 * oneFirstToken, (await firstToken.balanceOf(alex)).toNumber());
        // optionToken has 0 First Tokens.
        assert.equal(0, (await firstToken.balanceOf(optionToken.address)).toNumber());
    }

    async function tokenToTokenPut(firstTokenDecimals, secondTokenDecimals, strikePrice){
        let firstToken  = await TokenMock.new('First Token',  'First',  firstTokenDecimals);
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneFirstToken  = Math.pow(10, firstTokenDecimals);
        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneFirstToken;

        await firstToken.mint(alex, oneFirstToken);
        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, firstToken.address, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, false, "OptionToken", firstTokenDecimals);

        // 1. Issue tokens
        await secondToken.approve(optionToken.address, strikePrice * oneSecondToken, {from: bob});
        await optionToken.issueWithToken(oneOptionToken, {from: bob});

        // Bob has 0 Second Tokens.
        assert.equal(0, (await secondToken.balanceOf(bob)).toNumber());
        // Bob has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.999 `strikePrice` Second Token.
        assert.equal(0.999 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.001 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(alex, 0.75 * oneOptionToken, {from: bob});
        await firstToken.approve(optionToken.address, 0.75 * oneFirstToken, {from: alex});
        await optionToken.executeWithToken(0.75 * oneOptionToken, {from: alex});

        // Bob has 0.75 First Tokens.
        assert.equal(0.75 * oneFirstToken, (await firstToken.balanceOf(bob)).toNumber());
        // Alex has 0.7485 * `strikePrice` Second Tokens. 
        let expected = new BigNumber(realStrikePrice).multipliedBy(0.7485);
        assert.equal(expected, (await secondToken.balanceOf(alex)).toNumber());
        // Alex has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.249 `strikePrice` Second Token.
        assert.equal(0.249 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0025 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 3. Cancel issued tokens.
        await optionToken.cancel(0.2 * oneOptionToken, {from: bob});

        // Bob has 0.1994 Second Tokens.
        assert.equal(0.1994 * realStrikePrice, (await secondToken.balanceOf(bob)).toNumber());
        // Bob has 0.049 Option Tokens.
        assert.equal(0.049 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.049 * strikePrice Second Token.
        assert.equal(0.049 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0031 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);

        await optionToken.refund({from: charlie});

        // Bob has 0.1994 + 0.049 * strikePrice Second Tokens.
        assert.equal(0.2484 * realStrikePrice, (await secondToken.balanceOf(bob)).toNumber());
        // optionToken has 0 Second Tokens.
        assert.equal(0, (await secondToken.balanceOf(optionToken.address)).toNumber());
    }

    async function etherToTokenCall(secondTokenDecimals, strikePrice){
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneEther;

        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, etherAddress, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, true, "OptionToken", 18);

        // 1. Issue tokens
        let ownersEther = (await web3.eth.getBalance(owner)).toNumber();

        await optionToken.issueWithWei({value: oneEther, from: alex});
        
        // Alex has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.999 Ether.
        assert.equal(0.999 * oneEther, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        let ownersEtherAfterIssue = (await web3.eth.getBalance(owner)).toNumber();
        assert.equal(0.001 * oneEther + ownersEther, ownersEtherAfterIssue);

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(bob, 0.75 * oneOptionToken, {from: alex});
        await secondToken.approve(optionToken.address, 0.75 * realStrikePrice, {from: bob});

        let bobsEtherBeforeExecute = (await web3.eth.getBalance(bob)).toNumber();

        let tx = await optionToken.executeWithToken(0.75 * oneOptionToken, {from: bob});

        // Alex has 0.75 * `strikePrice` Second Tokens.
        assert.equal(0.75 * realStrikePrice, (await secondToken.balanceOf(alex)).toNumber());
        // Bob has 0.75 Ether more.
        let bobsEtherAfterExecute = (await web3.eth.getBalance(bob)).toNumber();
        let usedWeiOnGas = Utils.getUsedWeiOnGasAmount(tx);
        let expected = new BigNumber(oneEther).multipliedBy(0.7485).plus(bobsEtherBeforeExecute).minus(usedWeiOnGas);
        assert.equal(expected, bobsEtherAfterExecute);
        // Bob has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.249 Ether
        assert.equal(0.249 * oneEther, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        expected = new BigNumber(oneEther).multipliedBy(0.0025).plus(ownersEther);
        assert.equal(expected, (await web3.eth.getBalance(owner)).toNumber());

        // 3. Cancel issued tokens.
        let alexEtherBeforeCancel = (await web3.eth.getBalance(alex)).toNumber();

        tx = await optionToken.cancel(0.2 * oneOptionToken, {from: alex});

        // Alex has 0.1994 Ether back.
        let alexEtherAfterCancel = (await web3.eth.getBalance(alex)).toNumber();
        usedWeiOnGas = Utils.getUsedWeiOnGasAmount(tx);
        expected = new BigNumber(oneEther).multipliedBy(0.1994).plus(alexEtherBeforeCancel).minus(usedWeiOnGas);
        assert.equal(expected, alexEtherAfterCancel);
        // Alex has 0.049 Option Tokens.
        assert.equal(
            new BigNumber(oneOptionToken).multipliedBy(0.049), 
            (await optionToken.balanceOf(alex)).toNumber()
        );
        // OptionToken contract has 0.049 Ether.
        assert.equal(0.049 * oneEther, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        expected = new BigNumber(oneEther).multipliedBy(0.0031).plus(ownersEther);
        assert.equal(expected, (await web3.eth.getBalance(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);
        
        let alexEtherBeforeRefund = (await web3.eth.getBalance(alex)).toNumber();

        await optionToken.refund({from: charlie});

        // Alex has 0.049 Ether back.
        let alexEtherAfterRefund = (await web3.eth.getBalance(alex)).toNumber();
        assert.equal(0.049 * oneEther + alexEtherBeforeRefund, alexEtherAfterRefund);
        // OptionToken contract has 0 Ether.
        assert.equal(0, (await web3.eth.getBalance(optionToken.address)).toNumber());
    }

    async function etherToTokenPut(secondTokenDecimals, strikePrice){
        let secondToken = await TokenMock.new('Second Token', 'Second', secondTokenDecimals);

        let oneSecondToken = Math.pow(10, secondTokenDecimals);
        let oneOptionToken = oneEther;

        await secondToken.mint(bob, strikePrice * oneSecondToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneSecondToken;

        let optionToken = await OptionToken.new(factory.address, etherAddress, secondToken.address, 
            minIssueAmount, expiryDate, realStrikePrice, false, "OptionToken", 18);

        // 1. Issue tokens
        await secondToken.approve(optionToken.address, strikePrice * oneSecondToken, {from: bob});
        await optionToken.issueWithToken(oneOptionToken, {from: bob});

        // Bob has 0 Second Tokens.
        assert.equal(0, (await secondToken.balanceOf(bob)).toNumber());
        // Bob has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.999 `realStrikePrice` First Token.
        assert.equal(0.999 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.001 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(alex, 0.75 * oneOptionToken, {from: bob});

        let alexEtherBeforeExecute = (await web3.eth.getBalance(alex)).toNumber();
        let bobsEtherBeforeExecute = (await web3.eth.getBalance(bob)).toNumber();

        await optionToken.executeWithWei({value: 0.75 * oneEther, from: alex});

        // Bob has 0.75 Ether more.
        let bobsEtherAfterExecute = (await web3.eth.getBalance(bob)).toNumber();
        // let expected = new BigNumber(oneEther).multipliedBy(0.75)
        assert.equal(0.75 * oneEther + bobsEtherBeforeExecute, bobsEtherAfterExecute);
        // Alex has 0.75 * `strikePrice` Second Tokens.
        let expected = new BigNumber(realStrikePrice).multipliedBy(0.7485);
        assert.equal(expected, (await secondToken.balanceOf(alex)).toNumber());
        // Alex has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.2505 `strikePrice` Second Token.
        assert.equal(0.249 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0025 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 3. Cancel issued tokens.
        await optionToken.cancel(0.2 * oneOptionToken, {from: bob});

        // Bob has 0.2 Second Tokens.
        assert.equal(0.1994 * realStrikePrice, (await secondToken.balanceOf(bob)).toNumber());
        // Bob has 0.05 Option Tokens.
        assert.equal(0.049 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.049 * strikePrice Second Token.
        assert.equal(0.049 * realStrikePrice, (await secondToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0031 * realStrikePrice, (await secondToken.balanceOf(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);
        
        await optionToken.refund({from: charlie});

        // Bob has 0.1994 + 0.049 * strikePrice Second Tokens.
        assert.equal(0.2484 * realStrikePrice, (await secondToken.balanceOf(bob)).toNumber());
        // optionToken has 0 Second Tokens.
        assert.equal(0, (await secondToken.balanceOf(optionToken.address)).toNumber());
    }

    async function tokenToEtherCall(firstTokenDecimals, strikePrice){
        let firstToken  = await TokenMock.new('First Token',  'First',  firstTokenDecimals);

        let oneFirstToken  = Math.pow(10, firstTokenDecimals);
        let oneOptionToken = oneFirstToken;

        await firstToken.mint(alex, oneFirstToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneEther;

        let optionToken = await OptionToken.new(factory.address, firstToken.address, etherAddress, 
            minIssueAmount, expiryDate, realStrikePrice, true, "OptionToken", firstTokenDecimals);

        // 1. Issue tokens
        await firstToken.approve(optionToken.address, oneFirstToken, {from: alex});
        await optionToken.issueWithToken(oneOptionToken, {from: alex});

        // Alex has 0 First Tokens.
        assert.equal(0, (await firstToken.balanceOf(alex)).toNumber());
        // Alex has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.999 First Token.
        assert.equal(0.999 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.001 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(bob, 0.75 * oneOptionToken, {from: alex});

        let alexEtherBeforeExecute = (await web3.eth.getBalance(alex)).toNumber();

        await optionToken.executeWithWei({value: 0.75 * realStrikePrice, from: bob});

        // Alex has 0.75 Ether more.
        let alexEtherAfterExecute = (await web3.eth.getBalance(alex)).toNumber();
        let expected = new BigNumber(realStrikePrice).multipliedBy(0.75).plus(alexEtherBeforeExecute);
        assert.equal(expected, alexEtherAfterExecute, allowedEtherDelta);
        // Bob has 0.75 First Token.
        assert.equal(0.7485 * oneFirstToken, (await firstToken.balanceOf(bob)).toNumber());
        // Bob has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.249 First Token.
        assert.equal(0.249 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0025 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 3. Cancel issued tokens.
        await optionToken.cancel(0.2 * oneOptionToken, {from: alex});

        // Alex has 0.1994 First Tokens.
        assert.equal(0.1994 * oneFirstToken, (await firstToken.balanceOf(alex)).toNumber());
        // Alex has 0.049 Option Tokens.
        assert.equal(0.049 * oneOptionToken, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.049 First Token.
        assert.equal(0.049 * oneFirstToken, (await firstToken.balanceOf(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        assert.equal(0.0031 * oneFirstToken, (await firstToken.balanceOf(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);
        
        await optionToken.refund({from: charlie});

       // Alex has 0.1994 + 0.049 First Tokens.
        assert.equal(0.2484 * oneFirstToken, (await firstToken.balanceOf(alex)).toNumber());
        // optionToken has 0 First Tokens.
        assert.equal(0, (await firstToken.balanceOf(optionToken.address)).toNumber());
    }

    async function tokenToEtherPut(firstTokenDecimals, strikePrice){
        let firstToken  = await TokenMock.new('First Token',  'First',  firstTokenDecimals);

        let oneFirstToken  = Math.pow(10, firstTokenDecimals);
        let oneOptionToken = oneFirstToken;

        await firstToken.mint(alex, oneFirstToken);

        let expiryDate = Utils.getCurrentTimestamp() + 3600;
        let realStrikePrice = strikePrice * oneEther;

        let optionToken = await OptionToken.new(factory.address, firstToken.address, etherAddress, 
            minIssueAmount, expiryDate, realStrikePrice, false, "OptionToken", firstTokenDecimals);

        let ownersEther = (await web3.eth.getBalance(owner)).toNumber();
        
        // 1. Issue tokens
        await optionToken.issueWithWei({value: realStrikePrice, from: bob});

        // Bob has 0.999 Option Token.
        assert.equal(0.999 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has `realStrikePrice` of Ether.
        assert.equal(0.999 * realStrikePrice, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        let expected = new BigNumber(realStrikePrice).multipliedBy(0.001).plus(ownersEther);
        assert.equal(expected, (await web3.eth.getBalance(owner)).toNumber());

        // 2. Execute 0.75 Option Token.
        await optionToken.transfer(alex, 0.75 * oneOptionToken, {from: bob});
        await firstToken.approve(optionToken.address, 0.75 * oneFirstToken, {from: alex});

        let alexEtherBeforeExecute = (await web3.eth.getBalance(alex)).toNumber();

        let tx = await optionToken.executeWithToken(0.75 * oneOptionToken, {from: alex});

        // Bob has 0.75 First Tokens.
        assert.equal(0.75 * oneFirstToken, (await firstToken.balanceOf(bob)).toNumber());
        // Alex has 0.7485 * `strikePrice` of Ether more.
        let alexEtherAfterExecute = (await web3.eth.getBalance(alex)).toNumber();
        let usedWeiOnGas = Utils.getUsedWeiOnGasAmount(tx);
        expected = new BigNumber(realStrikePrice).multipliedBy(0.7485)
            .plus(alexEtherBeforeExecute).minus(usedWeiOnGas);
        assert.equal(expected, alexEtherAfterExecute);
        // Alex has 0 Option Tokens.
        assert.equal(0, (await optionToken.balanceOf(alex)).toNumber());
        // OptionToken contract has 0.249 `strikePrice` of Ether.
        assert.equal(0.249 * realStrikePrice, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        expected = new BigNumber(realStrikePrice).multipliedBy(0.0025).plus(ownersEther);
        assert.equal(expected, (await web3.eth.getBalance(owner)).toNumber());

        // 3. Cancel issued tokens.
        let bobEtherBeforeCancel = (await web3.eth.getBalance(bob)).toNumber();

        tx = await optionToken.cancel(0.2 * oneOptionToken, {from: bob});

        // Bob has 0.1994 `strikePrice` Ether more.
        usedWeiOnGas = Utils.getUsedWeiOnGasAmount(tx);
        expected = new BigNumber(realStrikePrice).multipliedBy(0.1994)
            .plus(bobEtherBeforeCancel).minus(usedWeiOnGas);
        assert.equal(expected, (await web3.eth.getBalance(bob)).toNumber());
        // Bob has 0.049 Option Tokens.
        assert.equal(0.049 * oneOptionToken, (await optionToken.balanceOf(bob)).toNumber());
        // OptionToken contract has 0.249 `strikePrice` of Ether.
        assert.equal(0.049 * realStrikePrice, (await web3.eth.getBalance(optionToken.address)).toNumber());
        // Factory onwer has collected fee.
        expected = new BigNumber(realStrikePrice).multipliedBy(0.0031).plus(ownersEther);
        assert.equal(expected, (await web3.eth.getBalance(owner)).toNumber());

        // 4. Refund unused tokens.
        Utils.increaseTime(3601);

        let bobEtherBeforeRefund = (await web3.eth.getBalance(bob)).toNumber();

        await optionToken.refund({from: charlie});

        // Bob has 0.049 * `strikePrice` of Ether more.
        let bobEtherAfterRefund = (await web3.eth.getBalance(bob)).toNumber();
        expected = new BigNumber(realStrikePrice).multipliedBy(0.049).plus(bobEtherBeforeRefund);
        assert.equal(expected, bobEtherAfterRefund);
        // optionToken has 0 Ether.
        assert.equal(0, (await web3.eth.getBalance(optionToken.address)).toNumber());
    }

    // Call ERC20 <-> ERC20

    it("Call, ERC20 18 decimals, ERC20 14 decimals, Strike 100", async() => {
        await tokenToTokenCall(18, 14, 100);
    });

    it("Call, ERC20 14 decimals, ERC20 18 decimals, Strike 100", async() => {
        await tokenToTokenCall(14, 18, 100);
    });

    it("Call, ERC20 18 decimals, ERC20 14 decimals, Strike 0.002", async() => {
        await tokenToTokenCall(18, 14, 0.002);
    });

    it("Call, ERC20 14 decimals, ERC20 18 decimals, Strike 0.002", async() => {
        await tokenToTokenCall(14, 18, 0.002);
    });

    // Put ERC20 <-> ERC20

    it("Put, ERC20 18 decimals, ERC20 14 decimals, Strike 100", async() => {
        await tokenToTokenPut(18, 14, 100);
    });
    it("Put, ERC20 14 decimals, ERC20 18 decimals, Strike 100", async() => {
        await tokenToTokenPut(14, 18, 100);
    });

    it("Put, ERC20 18 decimals, ERC20 14 decimals, Strike 0.002", async() => {
        await tokenToTokenPut(18, 14, 0.002);
    });

    it("Put, ERC20 14 decimals, ERC20 18 decimals, Strike 0.002", async() => {
        await tokenToTokenPut(14, 18, 0.002);
    });

    // Call ETH <-> ERC20

    it("Call, Ether, ERC20 14 decimals, Strike 100", async() => {
        await etherToTokenCall(14, 100);
    });

    it("Call, Ether, ERC20 20 decimals, Strike 100", async() => {
        await etherToTokenCall(20, 100);
    });

    it("Call, Ether, ERC20 14 decimals, Strike 0.1", async() => {
        await etherToTokenCall(14, 100);
    });

    it("Call, Ether, ERC20 20 decimals, Strike 0.1", async() => {
        await etherToTokenCall(20, 100);
    });
    // Put ETH <-> ERC20
    it("Put, Ether, ERC20 14 decimals, Strike 100", async() => {
        await etherToTokenPut(14, 100);
    });

    it("Put, Ether, ERC20 20 decimals, Strike 100", async() => {
        await etherToTokenPut(20, 100);
    });

    it("Put, Ether, ERC20 14 decimals, Strike 0.1", async() => {
        await etherToTokenPut(14, 100);
    });

    it("Put, Ether, ERC20 20 decimals, Strike 0.1", async() => {
        await etherToTokenPut(20, 100);
    });

    // Call ERC20 <-> ETH 

    it("Call, ERC20 14 decimals, Ether, Strike 10", async() => {
        await tokenToEtherCall(14, 10);
    });

    it("Call, ERC20 20 decimals, Ether, Strike 10", async() => {
        await tokenToEtherCall(20, 10);
    });

    it("Call, ERC20 14 decimals, Ether, Strike 0.042", async() => {
        await tokenToEtherCall(14, 0.042);
    });

    it("Call, ERC20 20 decimals, Ether, Strike 0.042", async() => {
        await tokenToEtherCall(20, 0.042);
    });

    // Put ERC20 <-> ETH 

    it("Put, ERC20 14 decimals, Ether, Strike 2", async() => {
        await tokenToEtherPut(14, 2);
    });

    it("Put, ERC20 20 decimals, Ether, Strike 2", async() => {
        await tokenToEtherPut(20, 2);
    });

    it("Put, ERC20 14 decimals, Ether, Strike 0.042", async() => {
        await tokenToEtherPut(14, 0.042);
    });

    it("Put, ERC20 20 decimals, Ether, Strike 0.042", async() => {
        await tokenToEtherPut(20, 0.042);
    });
});