// frontend/src/ethers.js
import { BrowserProvider } from 'ethers';
import { getConnectorClient } from 'wagmi/actions';

export async function getEthersProvider(config) {
    const client = await getConnectorClient(config);
    const { transport } = client;
    const network = {
        chainId: client.chain.id,
        name: client.chain.name,
        ensAddress: client.chain.contracts?.ensRegistry?.address,
    };
    return new BrowserProvider(transport, network);
}

export async function getEthersSigner(config) {
     const provider = await getEthersProvider(config);
     const signer = await provider.getSigner();
     return signer;
}