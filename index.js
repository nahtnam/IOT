const { prompt } = require('enquirer');

const Web3 = require('web3');
const tx = require('ethereumjs-tx');
const abi = require('ethereumjs-abi');
const lightwallet = require('eth-lightwallet');
const txutils = lightwallet.txutils;
const ipfsAPI = require('ipfs-api');
const fetch = require('node-fetch');

const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/'));

const contractorAddress = {
  address: process.env.CONTRACTOR_ADDRESS,
  key: process.env.CONTRACTOR_PRIVATE_KEY,
};

const userAddress = {
  address: process.env.USER_ADDRESS,
  key: process.env.USER_PRIVATE_KEY,
};

const contractAddress = process.env.CONTRACT_ADDRESS;
const interface = require('./abi.json');

const contract = web3.eth.contract(interface);
const iots = contract.at(contractAddress);

// let ipfs = 'QmS9ZWgYwaXux9Lv6jX7iY8TrwVNkowddhYCG9doZf1oZ9';
const data = require('./data.json');

const uploadToIPFS = (file) => new Promise((resolve, reject) => {
  ipfs.files.add(file, function (err, file) {
    if (err) {
      return reject(err);
    }
    return resolve(file);
  });
})

const sendRaw = (rawTx, address) => {
  var privateKey = new Buffer(address.key, 'hex');
  var transaction = new tx(rawTx);
  transaction.sign(privateKey);
  var serializedTx = transaction.serialize().toString('hex');
  return new Promise((resolve, reject) => {
    web3.eth.sendRawTransaction('0x' + serializedTx, function(err, result) {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  })
}

const getRawTx = (func, output, address) => {
  const txOptions = {
    nonce: web3.toHex(web3.eth.getTransactionCount(address.address)),
    gasLimit: web3.toHex(800000),
    gasPrice: web3.toHex(20000000000),
    to: contractAddress,
  }

  return txutils.functionTx(interface, func, output, txOptions);
}

const contractor = async () => {
  const register = async () => {
    const { begin, end } = await prompt([
      {
        type: 'numeral',
        name: 'begin',
        message: 'what is the begin time?',
      },
      {
        type: 'numeral',
        name: 'end',
        message: 'what is the end time?',
      }
    ]);
    const rawTx = getRawTx('addContractor', [begin, end], contractorAddress);
    const tx = await sendRaw(rawTx, contractorAddress);
    console.log('Transaction ID:', tx);
    console.log('Contractor Address', contractorAddress.address);
    menu();
  }
  const mine = async () => {
    const { hex } = await prompt({
      type: 'input',
      name: 'hex',
      message: 'what do you want to mine? (normally this would be automatic)',
    });
    const hash = `0x${hex}`;
    const queries = iots.queries(hash);
    if (queries[2] === '0x') {
      console.log('Could not find hash!');
      return menu();
    }
    const query = web3.toAscii(queries[2]);
    const split = query.split(' ');
    const from = split[1];
    const to = split[3];
    const queryRes = data.result.filter((obj) => (obj.time >= from && obj.time <= to));
    const ipfsRes = await uploadToIPFS(new Buffer(JSON.stringify(queryRes, null, 2)));
    const ipfsHash = ipfsRes[0].hash;
    const rawTx = getRawTx('respond', [hash, ipfsHash, 0], contractorAddress);
    const tx = await sendRaw(rawTx, contractorAddress);
    console.log('Transaction ID:', tx);
    console.log('Response Hash:', hash);
    console.log('IPFS Hash:', ipfsHash);
    menu();
  }

  const menu = async () => {
    const { action } = await prompt({
      type: 'select',
      name: 'action',
      message: 'what would you like to do?',
      choices: ['register', 'update', 'mine'],
      initial: 'register',
    });
    switch (action) {
      case 'register': {
        await register();
        break;
      }
      case 'update': {
        console.log('update');
        break;
      }
      case 'mine': {
        await mine();
        break;
      }
      default: {
        await mine();
        break;
      }
    }
  }
  menu();
}

const client = async () => {
  const query = async () => {
    const { address, query } = await prompt([
      {
        type: 'input',
        name: 'address',
        message: 'what address would you like to query?',
        initial: contractorAddress.address,
      },
      {
        type: 'input',
        name: 'query',
        message: 'what is your query?',
      }
    ]);
    const rawTx = getRawTx('query', [address, query, 0], userAddress);
    const tx = await sendRaw(rawTx, userAddress);
    const count = iots.counter(userAddress.address);
    const hash = abi.soliditySHA3(
      [ "address", "uint" ],
      [ userAddress.address, count.toNumber() ]
    ).toString('hex')
    console.log('Transaction ID:', tx);
    console.log('Query ID:', hash);
    menu();
  }

  const check = async () => {
    const { hex } = await prompt({
      type: 'input',
      name: 'hex',
      message: 'which transaction would you like to check?',
    });
    const hash = `0x${hex}`;
    const response = iots.responses(hash);
    const query = iots.queries(hash);
    if (response[1] === '0x') {
      console.log('Not mined yet!');
    }
    const ipfsHash = web3.toAscii(response[1]);
    console.log('IPFS Hash:', ipfsHash);
    console.log('Query:', web3.toAscii(query[2]));
    const res = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
    const output = await res.text();
    console.log('Response: ', output);
    menu();
  }
  const menu = async () => {
    const { action } = await prompt({
      type: 'select',
      name: 'action',
      message: 'what would you like to do?',
      choices: ['query', 'check'],
      initial: 'query',
    });
    switch (action) {
      case 'query': {
        await query();
        break;
      }
      case 'check': {
        await check();
        break;
      }
      default: {
        await query();
        break;
      }
    }
  }
  menu();
}

const program = async () => {
  const { type } = await prompt({
    type: 'select',
    name: 'type',
    message: 'would you like to start a contractor or client?',
    choices: ['contractor', 'client'],
    initial: 'contractor',
  });

  if (!type || type === 'contractor') {
    return contractor();
  }
  return client();
}

program().catch((err) => {
  console.log(err);
});
