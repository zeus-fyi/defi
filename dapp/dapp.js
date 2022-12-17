var Web3 = require('web3');
var ProviderEngine = require('web3-provider-engine');
var RpcSubprovider = require('web3-provider-engine/subproviders/rpc');
var FilterSubprovider = require('web3-provider-engine/subproviders/filters');
var LedgerWalletSubproviderFactory = require('@ledgerhq/hw-transport-mocker');//.default;
var LedgerWalletSubprovider = require('@ledgerhq/hw-transport-mocker').LedgerWalletSubprovider;

DApp = {
    web3Provider: null,
    engine: null,
    isLedger: false,
    tokenMockContract: null,
    exchangeContract: null,
    optionFactoryContract: null,
    optionTokenContract: null,
    currentAccount: null,
    ethWeiAmount: null,
    tokenMockAmount: null,
    tokenMockAllowance: null,
    ethWeiAmountOnExchange: null,
    tokenMockAmountOnExchange: null,
    etherAddress: '0x0000000000000000000000000000000000000000',
    orderHash: null,
    signedOrder: null,
    signedTrade: null,
    orderNonce: null,
    tradeNonce: null,
    makerAddress: null,
    takerAddress: null,
    feeAccount: null,
    withdrawalFee: null,
    makerExpires: null,
    takerExpires: null,
    erc20Abi: [{"constant": true,"inputs": [],"name": "name","outputs": [{"name": "","type": "string"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "_spender","type": "address"},{"name": "_value","type": "uint256"}],"name": "approve","outputs": [{"name": "","type": "bool"}],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [],"name": "totalSupply","outputs": [{"name": "","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "_from","type": "address"},{"name": "_to","type": "address"},{"name": "_value","type": "uint256"}],"name": "transferFrom","outputs": [{"name": "","type": "bool"}],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [],"name": "decimals","outputs": [{"name": "","type": "uint8"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": true,"inputs": [],"name": "symbol","outputs": [{"name": "","type": "string"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "_to","type": "address"},{"name": "_value","type": "uint256"}],"name": "transfer","outputs": [{"name": "","type": "bool"}],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"},{"name": "_spender","type": "address"}],"name": "allowance","outputs": [{"name": "","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"},{"inputs": [],"payable": false,"stateMutability": "nonpayable","type": "constructor"}],
    exchangeAbi: [{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"amount","type":"uint256"},{"name":"user","type":"address"},{"name":"nonce","type":"uint256"},{"name":"v","type":"uint8"},{"name":"r","type":"bytes32"},{"name":"s","type":"bytes32"},{"name":"gasCost","type":"uint256"}],"name":"adminWithdraw","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"currencyTokenAddress","type":"address"},{"name":"isApproved","type":"bool"}],"name":"approveCurrencyTokenAddress","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"amount","type":"uint256"}],"name":"depositToken","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"user","type":"address"},{"name":"nonce","type":"uint256"}],"name":"invalidateOrdersBefore","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldFee","type":"uint256"},{"indexed":false,"name":"newFee","type":"uint256"}],"name":"MakerFeeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"token","type":"address"},{"indexed":false,"name":"user","type":"address"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"balance","type":"uint256"}],"name":"Withdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"token","type":"address"},{"indexed":false,"name":"user","type":"address"},{"indexed":false,"name":"amount","type":"uint256"},{"indexed":false,"name":"balance","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"tokenBuy","type":"address"},{"indexed":false,"name":"amountBuy","type":"uint256"},{"indexed":false,"name":"tokenSell","type":"address"},{"indexed":false,"name":"amountSell","type":"uint256"},{"indexed":false,"name":"maker","type":"address"},{"indexed":false,"name":"taker","type":"address"}],"name":"Trade","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"oldFee","type":"uint256"},{"indexed":false,"name":"newFee","type":"uint256"}],"name":"TakerFeeUpdated","type":"event"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"from","type":"address"},{"name":"amount","type":"uint256"}],"name":"receiveTokenDeposit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"admin","type":"address"},{"name":"isAdmin","type":"bool"}],"name":"setAdmin","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_makerFee","type":"uint256"}],"name":"setMakerFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_takerFee","type":"uint256"}],"name":"setTakerFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"tradeValues","type":"uint256[11]"},{"name":"tradeAddresses","type":"address[4]"},{"name":"v","type":"uint8[2]"},{"name":"rs","type":"bytes32[4]"}],"name":"trade","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"amount","type":"uint256"}],"name":"withdraw","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_makerFee","type":"uint256"},{"name":"_takerFee","type":"uint256"},{"name":"_feeAccount","type":"address"},{"name":"_inactivityReleasePeriod","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"admins","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"approvedCurrencyTokens","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"user","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeAccount","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"inactivityReleasePeriod","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"invalidOrder","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"lastActiveTransaction","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"makerFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"orderFills","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"takerFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"tokens","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"withdrawn","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"}],
    optionFactoryAbi: [{"constant":true,"inputs":[],"name":"dexbTreshold","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dexbIssueFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dexbExecuteFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"cancelFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setIssueFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setExecuteFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"user","type":"address"},{"name":"value","type":"uint256"}],"name":"calcExecuteFeeAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"issueFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setDexbCancelFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"expiryDate","type":"uint256"},{"name":"firstToken","type":"address"},{"name":"secondToken","type":"address"},{"name":"strikePrice","type":"uint256"},{"name":"isCall","type":"bool"},{"name":"decimals","type":"uint8"}],"name":"getOptionAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"user","type":"address"},{"name":"value","type":"uint256"}],"name":"calcIssueFeeAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"HUNDERED_PERCENT","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"treshold","type":"uint256"}],"name":"setDexbTreshold","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"expiryDate","type":"uint256"},{"name":"firstToken","type":"address"},{"name":"secondToken","type":"address"},{"name":"strikePrice","type":"uint256"},{"name":"isCall","type":"bool"},{"name":"decimals","type":"uint8"},{"name":"name","type":"string"}],"name":"createOption","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"user","type":"address"},{"name":"value","type":"uint256"}],"name":"calcCancelFeeAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setDexbIssueFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"dexbCancelFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_FEE","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setCancelFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"fee","type":"uint256"}],"name":"setDexbExecuteFee","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"executeFee","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"dexb","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_dexb","type":"address"},{"name":"_dexbTreshold","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"}],
    optionTokenAbi: [{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"secondToken","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"cancel","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"refund","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"executeWithToken","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_subtractedValue","type":"uint256"}],"name":"decreaseApproval","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"firstToken","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isCall","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"executeWithWei","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"strikePrice","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"issueWithWei","outputs":[{"name":"","type":"bool"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_addedValue","type":"uint256"}],"name":"increaseApproval","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"expiry","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalIssued","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"amount","type":"uint256"}],"name":"issueWithToken","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_factory","type":"address"},{"name":"_firstToken","type":"address"},{"name":"_secondToken","type":"address"},{"name":"_expiry","type":"uint256"},{"name":"_strikePrice","type":"uint256"},{"name":"_isCall","type":"bool"},{"name":"_symbol","type":"string"},{"name":"_decimals","type":"uint8"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}],

    //Options related variables
    optionTokenAddress: null,    
    optionTokenName: 'ETHMOCK_noDate_10_call',
    optionFactoryOwner: null,
    optionTokenBalance: null,
    optionTokenWeiAmount: null,
    mockTokenAllowForOptionToken: null,
    futureDate: 1530000000,

    // set to true to use ledger as opposed to metamask
    ledger: false,
    derivationPath: "44'/60'/0'/0",

    // set to true to use with local blockchain
    development: false,
    //Local Truffle/Ganache
    // tokenMockAddress: "0x8f0483125fcb9aaaefa9209d8e9d7b9c8b9fb90f",
    // exchangeAddress: "0x345ca3e014aaf5dca488057592ee47305d9b3e10",
    // feeAccount: "0xf17f52151ebef6c7334fad080c5704d77216b732",
    // optionFactoryAddress: "0xfb88de099e13c3ed21f80a7a1e49f8caecf10df6",

    //Ropsten
    networkId: 3,
    tokenMockAddress: "0xa8DD19d74c12083F4d3cF8B323bC3c8a9F16c605",
    exchangeAddress: "0x0fc97f2debd73f0610736a1a40168fcbab3713bd",
    feeAccount: "0x2fB9d0e07569a0F6614ca9aE4053cE0368Ed0FBe",
    optionFactoryAddress: "0x88f8f613FFBC9CD5916942567690BBd7FB23BD84",

    init: function() {
        console.log('[x] Initializing DApp.');
        this.initWeb3();
        console.log('test');
        console.log(Dapp.getExpiration);
    },

    initWeb3: function() {

        if (DApp.ledger) {
            DApp.engine = new ProviderEngine();
            promiseLedgerWalletSubProvider = LedgerWalletSubproviderFactory.default(
                function() { return DApp.networkId; }, DApp.derivationPath);

            promiseLedgerWalletSubProvider.then(function(provider) {
                console.log("provider", provider);
                console.log(provider.isSupported ? 'Yes' : 'No');
                
                DApp.engine.getNetworkId = function(){return DApp.networkId};
                DApp.engine.addProvider(provider);
                //ALEX: Register for Infura account, and replace the below
                DApp.engine.addProvider(new RpcSubprovider({rpcUrl: 'https://ropsten.infura.io/vCE9q890Is08T4xq5qKm'}));
                
                DApp.engine.start();
                web3 = new Web3(DApp.engine);
                DApp.web3Provider = DApp.engine;

                console.log('[x] web3 Ledger object initialized.');
                DApp.initContracts();            
            });
        } else if(typeof web3 !== 'undefined') {
            //Is there is an injected web3 instance?
            DApp.web3Provider = web3.currentProvider;
            web3 = new Web3(DApp.web3Provider);

            console.log('[x] web3 object initialized.');
            DApp.initContracts(); 
        } else {
            alert("No injected web3 instance is detected");
        }
    },

    getSignFn: function(){
         if(web3.currentProvider.isMetaMask === true){
            return web3.eth.personal.sign;
        } else {
            return web3.eth.sign;
        }
    },

    initContracts: function() {
        DApp.tokenMockContract = new web3.eth.Contract(DApp.erc20Abi, DApp.tokenMockAddress);
        DApp.tokenMockContract.setProvider(DApp.web3Provider);
        console.log('[x] TokenMock contract initialized.');
        
        DApp.exchangeContract = new web3.eth.Contract(DApp.exchangeAbi, DApp.exchangeAddress);
        DApp.exchangeContract.setProvider(DApp.web3Provider);
        console.log('[x] Exchange contract initialized.');

        DApp.optionFactoryContract = new web3.eth.Contract(DApp.optionFactoryAbi, DApp.optionFactoryAddress);
        DApp.optionFactoryContract.setProvider(DApp.web3Provider);
        console.log('[x] OptionFactory contract initialized.');

        DApp.loadAccount();
        DApp.updateFrontend();
        DApp.withdrawalFee = web3.utils.toWei("0", "finney");
    },

    depositEth: function() {
        let ethAmount = $("#deposit-eth-amount").val();
        let weiAmount = web3.utils.toWei(ethAmount, "ether");

        DApp.exchangeContract.methods.deposit().send(
            {
                value: weiAmount,
                from: DApp.currentAccount,
                gas: 3000000
            },
            function(error, result){
                console.log(error,result);
                console.log('[x] ETH deposited.');
            }
        );
    },

    mockTokenAllow: function() {
        let allowAmount = DApp.toWei($("#allow-mock-token-amount").val());
        DApp.tokenMockContract.methods.approve(DApp.exchangeAddress, allowAmount).send(
            {
                from: DApp.currentAccount,
                gas: 3000000
            },
            function(result){
                console.log('[x] Allowance changed.');
            }
        );
    },

    depositMockToken: function() {
        let depositAmount = DApp.toWei($("#deposit-mock-token-amount").val());
        DApp.exchangeContract.methods.depositToken(DApp.tokenMockAddress, depositAmount).send(
            {
                from: DApp.currentAccount,
                gas: 3000000
            },
            function(result){
                console.log('[x] Tokens deposited.');
            }
        );
    },

    withdrawEth: function() {
        let weiAmount = DApp.toWei($("#withdraw-eth-amount").val());
        DApp.exchangeContract.methods.withdraw(DApp.etherAddress, weiAmount).send(
            {
                from: DApp.currentAccount,
                gas: 3000000
            },
            function(result){
                console.log('[x] ETH withdrawn.');
            }
        );
    },

    adminWithdrawEth: function() {
        DApp.adminAddress = DApp.currentAccount;
        let weiAmount = DApp.toWei($("#withdraw-admin-eth-amount").val());
        let nonce = DApp.getNonce();

        let withdrawHash = web3.utils.soliditySha3(
            DApp.exchangeAddress, DApp.etherAddress, weiAmount, DApp.currentAccount, nonce);

        web3.eth.sign(withdrawHash, DApp.currentAccount).then(function(signed){
            let [r, s, v] = DApp.getRSV(signed);

            DApp.exchangeContract.methods.adminWithdraw(
                DApp.etherAddress, weiAmount, DApp.currentAccount,
                nonce, v, r, s, DApp.withdrawalFee).send(
                {
                    from: DApp.adminAddress,
                    gas: 3000000
                },
                function(result){
                    console.log('[x] admin ETH withdrawn.');
                }
            );
            DApp.updateFrontend();
        });
    },

    withdrawMockToken: function() {
        let withdrawAmount = DApp.toWei($("#withdraw-mock-token-amount").val());
        DApp.exchangeContract.methods.withdraw(DApp.tokenMockAddress, withdrawAmount).call(
            function(result){
                console.log('[x] Mock Tokens withdrawn.');
            }
        );
    },

    adminWithdrawMockToken: function() {

        DApp.adminAddress = DApp.currentAccount;
        let weiAmount = DApp.toWei($("#withdraw-admin-mock-token-amount").val());
        let nonce = DApp.getNonce();

        let withdrawHash = web3.utils.soliditySha3(
            DApp.exchangeAddress, DApp.tokenMockAddress, weiAmount, DApp.currentAccount, nonce);

        getSignFn()(withdrawHash, DApp.currentAccount).then(function(signed){
            let [r, s, v] = DApp.getRSV(signed);

            DApp.exchangeContract.methods.adminWithdraw(
                DApp.tokenMockAddress, weiAmount, DApp.currentAccount,
                nonce, v, r, s, DApp.withdrawalFee).call(
                {
                    from: DApp.adminAddress,
                    gas: 3000000
                },
                function(error,result){
                    console.log(error,result);
                    console.log('[x] admin token withdrawn.');
                }
            );
            DApp.updateFrontend();
        });
    },

    setMockTokenAllowanceForOptionToken: function(){
        let allowAmount = DApp.toWei($("#new-mock-token-allowance-for-option-token-contract").val());
        DApp.tokenMockContract.methods.approve(DApp.optionTokenAddress, allowAmount).send(
            {
                from: DApp.currentAccount,
                gas: 3000000
            },
            function(result){
                console.log('[x] Allowance changed.');
            }
        );
    },

    loadAccount: function() {
        console.log("Loading accounts...");

        web3.eth.getAccounts(function(error, accounts) {
            if(error) {
                console.error(error);
            } else {
                console.log(accounts);
                DApp.currentAccount = accounts[0];
                console.log("[x] Using account", DApp.currentAccount);

                if(DApp.ledger){
                    const indexOffset = 0;
                    const accountsNo = 10;
                    DApp.web3Provider._providers[0].ledger.getMultipleAccounts(
                        DApp.derivationPath, 
                        indexOffset, 
                        accountsNo 
                    ).then(function(accounts) {
                        console.log("Other available Ledger accounts: ", accounts);
                    });
                }
                DApp.loadData();
            }
        });
        
    },

    loadData: function() {
        DApp.loadEthBalance();
        DApp.loadEthBalanceOnExchange();
        DApp.loadEthBalanceOnFeeAccount();

        DApp.loadMockTokenBalance();
        DApp.loadMockTokenBalanceOnExchange();
        DApp.loadMockTokenAllowance();
        DApp.loadMockTokenBalanceOnFeeAccount();

        DApp.loadOption();
        DApp.loadOptionFactoryOwner();

        DApp.updateFrontend();
    },

    loadEthBalance: function(){
        web3.eth.getBalance(DApp.currentAccount, function(error, result){
            if(error) {
                console.error(error);
            } else {
                DApp.ethWeiAmount = result;
                DApp.updateFrontend();
            }
        });
    },

    loadMockTokenBalance: function(){
        DApp.tokenMockContract.methods.balanceOf(DApp.currentAccount).call(
            function(error, balance){
                DApp.tokenMockAmount = balance;
                DApp.updateFrontend();
            }
        );
    },

    loadMockTokenAllowance: function(){
        DApp.tokenMockContract.methods.allowance(DApp.currentAccount, DApp.exchangeAddress).call(
            function(error, allowance){
                DApp.tokenMockAllowance = allowance;
                DApp.updateFrontend();
            }
        );
    },

    loadMockTokenBalanceOnExchange: function(){
        DApp.exchangeContract.methods.balanceOf(DApp.tokenMockAddress, DApp.currentAccount).call(
            function(error, balance){
                DApp.tokenMockAmountOnExchange = balance;
                DApp.updateFrontend();
            }
        );
    },

    loadEthBalanceOnExchange: function(){
        web3.eth.call(
            {
                to: DApp.exchangeAddress, 
                data: DApp.exchangeContract.methods.balanceOf(DApp.etherAddress, DApp.currentAccount).encodeABI()
            },
            function(error, balance){
                DApp.ethWeiAmountOnExchange = balance;
                DApp.updateFrontend();
            }
        );
    },

    loadMockTokenBalanceOnFeeAccount: function(){
        DApp.exchangeContract.methods.balanceOf(DApp.tokenMockAddress, DApp.feeAccount).call(
            function(error, balance){
                DApp.tokenMockAmountOnFeeAccount = balance;
                DApp.updateFrontend();
            }
        );   
    },

    loadEthBalanceOnFeeAccount: function(){
        DApp.exchangeContract.methods.balanceOf(DApp.etherAddress, DApp.feeAccount).call(
            function(error, balance){
                DApp.ethWeiAmountOnFeeAccount = balance;
                DApp.updateFrontend();
            }
        );
    },

    loadOption: function() {
        DApp.optionFactoryContract.methods.getOptionAddress(
            DApp.futureDate, DApp.etherAddress, DApp.tokenMockAddress, DApp.toWei('10'), true, 18).call(
            function(error, tokenAddress){
                if(error){
                    console.log("[x] Error while loading option", error);
                } else if(tokenAddress === DApp.etherAddress) {
                    DApp.optionTokenAddress = 'Not yet deployed';
                    console.log('[x] OptionToken doesnt exists.');
                } else {
                    DApp.optionTokenAddress = tokenAddress;
                    console.log('[x] OptionToken exists at', tokenAddress);

                    DApp.optionTokenContract = new web3.eth.Contract(DApp.optionTokenAbi, DApp.optionTokenAddress);
                    DApp.optionTokenContract.setProvider(DApp.web3Provider);
                    console.log('[x] OptionToken contract initialized.');

                    DApp.loadOptionTokenBalance();
                    DApp.loadEthBalanceOnOptionToken();
                    DApp.loadMockTokenAllowanceForOptionToken();
                }
                DApp.updateFrontend();
            }
        )
    },

    loadOptionTokenBalance: function() {
        DApp.optionTokenContract.methods.balanceOf(DApp.currentAccount).call(
            function(error, balance){
                DApp.optionTokenBalance = balance;
                DApp.updateFrontend();
            }
        );
    },

    loadOptionFactoryOwner: function() {
        DApp.optionFactoryContract.methods.owner().call(function(error, owner){
            DApp.optionFactoryOwner = owner;
            DApp.updateFrontend();
        });
    },

    loadEthBalanceOnOptionToken: function(){
        web3.eth.getBalance(DApp.optionTokenAddress, function(error, result){
            if(error) {
                console.error(error);
            } else {
                DApp.optionTokenWeiAmount = result;
                DApp.updateFrontend();
            }
        });
    },

    loadMockTokenAllowanceForOptionToken: function(){
        DApp.tokenMockContract.methods.allowance(DApp.currentAccount, DApp.optionTokenAddress).call(
            function(error, allowance){
                DApp.mockTokenAllowForOptionToken = allowance;
                DApp.updateFrontend();
            }
        );
    },

    createOptionToken: function() {
        DApp.optionFactoryContract.methods.createOption(
            DApp.futureDate, DApp.etherAddress, DApp.tokenMockAddress, DApp.toWei('10'), true, 18, DApp.optionTokenName
        ).send(
            {
                gas: 5000000,
                from: DApp.currentAccount
            },
            function(error){
                if(error){
                    console.log('[x] Error during option token creation', error);
                } else {
                    console.log('[x] Option Token created');
                }
            }
        );
    },

    issueOptions: function() {
        DApp.optionTokenContract.methods.issueWithWei().send(
            {
                gas: 5000000,
                from: DApp.currentAccount,
                value: DApp.toWei($('#issue-new-options-amount').val())
            },
            function(error){
                if(error){
                    console.log('[x] Error during issuing', error);
                } else {
                    console.log('[x] Options issued');
                }   
            }
        )
    },

    cancelOptions: function() {
        DApp.optionTokenContract.methods
            .cancel(DApp.toWei($('#cancel-options-amount').val())).send(
            {
                gas: 5000000,
                from: DApp.currentAccount,
            },
            function(error){
                if(error){
                    console.log('[x] Error during canceling', error);
                } else {
                    console.log('[x] Options canceled');
                }   
            }
        )
    },

    executeOptions: function() {
        DApp.optionTokenContract.methods
            .executeWithToken(DApp.toWei($('#execute-options-amount').val())).send(
            {
                gas: 5000000,
                from: DApp.currentAccount,
            },
            function(error){
                if(error){
                    console.log('[x] Error during execution', error);
                } else {
                    console.log('[x] Options executied');
                }   
            }
        )
    },

    createOrder: function(){
        DApp.orderNonce = DApp.getNonce();
        //Dapp.makerExpires = 4022874000; //Dapp.getExpiration();
        DApp.makerAddress = DApp.currentAccount;

        DApp.orderHash = web3.utils.soliditySha3(
            DApp.exchangeAddress, 
            DApp.etherAddress, 
            DApp.toWei($('#order-base-token-amount').val()), 
            DApp.tokenMockAddress,
            DApp.toWei($('#order-quote-token-amount').val()),
            4022874000, //Dapp.makerExpires,
            DApp.orderNonce, 
            DApp.makerAddress);

        web3.eth.personal.sign(DApp.orderHash, DApp.makerAddress).then(function(signed){
            DApp.signedOrder = signed;
            console.log(DApp.getRSV(signed));
            DApp.updateFrontend();
        });
    },

    fillTrade: function(){
        DApp.tradeNonce = DApp.getNonce();
        //Dapp.takerExpires =  4022874000;//Dapp.getExpiration();
        DApp.takerAddress = DApp.currentAccount;

        let tradeHash = web3.utils.soliditySha3(
            DApp.exchangeAddress, 
            DApp.tokenMockAddress,
            DApp.toWei($('#trade-base-token-amount').val()),
            DApp.etherAddress,
            DApp.toWei($('#trade-quote-token-amount').val()),
            4022874000, //Dapp.takerExpires, 
            DApp.tradeNonce,
            DApp.takerAddress);

        web3.eth.personal.sign(tradeHash, DApp.takerAddress).then(function(signed){
            DApp.signedTrade = signed;
            console.log(DApp.getRSV(signed));
            DApp.updateFrontend();
        });
    },

    //helper method to extract RSV components from the signature required for validation
    getRSV: function(signedMsg) {
        const r = signedMsg.substr(0, 66);
        const s = '0x' + signedMsg.substr(66, 64);
        const v = '0x' + signedMsg.substr(130, 2);
        const v_decimal = web3.utils.toDecimal(v);
        return [r, s, v_decimal];
    },

    getNonce: function() {
        return Math.random() * 1000000000000000000;
    },

    getExpiration: function() {
        return web3.eth.getBlockNumber() + 120000;
    },

    executeTrade: function(){
        console.log("Executing trade...");

        //execute
        DApp.adminAddress = DApp.currentAccount;

        console.log('maker');
        console.log(DApp.signedOrder);
        console.log('taker');
        console.log(DApp.signedTrade);

        let [r1, s1, v1] = DApp.getRSV(DApp.signedOrder);
        let [r2, s2, v2] = DApp.getRSV(DApp.signedTrade);

        let tradeValues = [
            DApp.toWei($('#order-base-token-amount').val()), 
            DApp.toWei($('#order-quote-token-amount').val()), 
            DApp.orderNonce,
            DApp.toWei($('#trade-base-token-amount').val()), 
            DApp.toWei($('#trade-quote-token-amount').val()), 
            4022874000, //Dapp.takerExpires,
            DApp.tradeNonce, 
            DApp.toWei($('#order-base-token-amount').val()), 
            DApp.toWei($('#order-quote-token-amount').val()), 
            4022874000, //Dapp.takerExpires,
            0];

            console.log(tradeValues);

        let tradeAddresses = [ 
            DApp.etherAddress,
            DApp.tokenMockAddress, 
            DApp.makerAddress, 
            DApp.takerAddress];

        console.log(tradeAddresses);

        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        console.log(v);
        console.log(rs);

        web3.eth.sendTransaction(
            {
                from: DApp.adminAddress,
                to: DApp.exchangeAddress, 
                data: DApp.exchangeContract.methods.trade(tradeValues, tradeAddresses, v, rs).encodeABI(),
                gas: 3000000
            },
            function(error, tx, x){
                console.log(error, tx, x);
                if(tx.logs) {
                    console.log("[tx]", tx.logs);
                }
            }
        );
        DApp.updateFrontend();
    },

    fromWei: function(amount){
        return web3.utils.fromWei(amount, 'ether');
    },

    toWei: function(amount){
        return web3.utils.toWei(amount, 'ether');
    },

    updateFrontend: function(){
        let not = 'Not loaded'
        $('#eth-amount').html(DApp.ethWeiAmount ? DApp.fromWei(DApp.ethWeiAmount) : not);
        $('#token-mock-amount').html(DApp.tokenMockAmount ? DApp.fromWei(DApp.tokenMockAmount.toString(10)) : not);
        $('#token-mock-allowance').html(DApp.tokenMockAllowance ? DApp.fromWei(DApp.tokenMockAllowance.toString(10)) : not);
        $('#eth-amount-on-exchange').html(DApp.ethWeiAmountOnExchange ? DApp.fromWei(DApp.ethWeiAmountOnExchange.toString(10)) : not);
        $('#mock-token-amount-on-exchange').html(DApp.tokenMockAmountOnExchange ? DApp.fromWei(DApp.tokenMockAmountOnExchange.toString(10)) : not);
        $('#eth-amount-on-fee-account').html(DApp.ethWeiAmountOnFeeAccount ? DApp.fromWei(DApp.ethWeiAmountOnFeeAccount.toString(10)) : not);
        $('#mock-token-amount-on-fee-account').html(DApp.tokenMockAmountOnFeeAccount ? DApp.fromWei(DApp.tokenMockAmountOnFeeAccount.toString(10)) : not);

        $('#order-exchange-address').html(DApp.exchangeAddress);
        $('#order-quote-token').val(DApp.tokenMockAddress);
        $('#order-maker-address').html(DApp.makerAddress ? DApp.makerAddress : not);
        $('#order-nonce').html(DApp.orderNonce ? DApp.orderNonce : not);
        $('#order-signed').html(DApp.signedOrder ? DApp.signedOrder : not);

        $('#trade-order-signed').html(DApp.signedOrder ? DApp.signedOrder : not);
        $('#trade-taker-address').html(DApp.takerAddress ? DApp.takerAddress : not);
        $('#trade-nonce').html(DApp.tradeNonce ? DApp.tradeNonce : not);
        $('#trade-signed').html(DApp.signedTrade ? DApp.signedTrade : not);

        $('#execute-order-signed').html(DApp.signedOrder ? DApp.signedOrder : not);
        $('#execute-trade-signed').html(DApp.signedTrade ? DApp.signedTrade : not);
        $('#execute-admin-address').html(DApp.adminAddress ? DApp.adminAddress : not);
        
        $('#option-token-name').html(DApp.optionTokenName);
        $('#option-token-address').html(DApp.optionTokenAddress || not);
        $('#option-factory-owner').html(DApp.optionFactoryOwner || not);
        $('#option-token-balance').html(DApp.optionTokenBalance ? DApp.fromWei(DApp.optionTokenBalance) : not);
        $('#eth-in-option-token-contract').html(DApp.optionTokenWeiAmount ? DApp.fromWei(DApp.optionTokenWeiAmount) : not);
        $('#mock-token-allowance-for-option-token-contract')
            .html(DApp.mockTokenAllowForOptionToken ? DApp.fromWei(DApp.mockTokenAllowForOptionToken) : not);
    }
}

$(function() {
    DApp.init();
});
