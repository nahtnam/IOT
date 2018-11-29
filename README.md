# IOT

The contract is located in the `contract.sol` file and the code for the script is in `index.js`.

## Requirements

- Node.js 8+
- NPM 5+
- 2 addresses with priv keys

## Usage

1. Run `npm install`
2. Add the following environment variables:
```bash
# EVERYTHIGN RUNS ON THE ROPSTEN NETWORK!
export CONTRACTOR_ADDRESS="" # contractor address
export CONTRACTOR_PRIVATE_KEY="" # contractor private key
export USER_ADDRESS="" # client address
export USER_PRIVATE_KEY="" # client private key
export CONTRACT_ADDRESS="" # address of published contract
```
3. Run `npm start` in two different terminals
4. Select `contractor` in one and `client` in the other.
5. Register a contractor from 0 to 10
6. After the transaction confirms, make a query from the client with the following text: `FROM X TO Y` where X and Y are between 0 and 10;
7. Mine the transaction with the given hash
8. Check the result of the query in client

## Todo

- [ ] [Fix CTRL + C issue](https://github.com/enquirer/enquirer/issues/13)
- [ ] Automatically mine when in contractor mode
- [ ] Calculate the cost based on the length of the return
- [ ] Add support for events in the contract
- [ ] Set up private contractors
- [ ] Handle refunds based on block number and duration specified by the client
- [ ] Add `0x` to the TXIDs
- [ ] Add support for pub/priv/shared keys
