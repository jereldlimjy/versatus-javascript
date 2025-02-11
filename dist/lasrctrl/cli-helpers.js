import fs, { promises as fsp } from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { runCommand } from '../lasrctrl/shell.js';
import { FAUCET_URL, } from '../lib/consts.js';
import axios from 'axios';
import { getIPFSForNetwork, getRPCForNetwork } from '../lib/utils.js';
export const isInstalledPackage = fs.existsSync(path.resolve(process.cwd(), 'node_modules', '@versatus', 'versatus-javascript'));
export const isTypeScriptProject = () => {
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    return fs.existsSync(tsConfigPath);
};
export const installedPackagePath = path.resolve(process.cwd(), 'node_modules', '@versatus', 'versatus-javascript');
export function copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);
        entry.isDirectory()
            ? copyDirectory(srcPath, destPath)
            : fs.copyFileSync(srcPath, destPath);
    }
}
export async function runBuildProcess(programFilePath) {
    await buildNode(programFilePath);
}
export async function buildNode(buildPath) {
    const configPath = isInstalledPackage
        ? `${installedPackagePath}/webpack.config.js`
        : './webpack.config.js';
    const webpackCommand = `npx webpack --config ${configPath} --entry ${buildPath}`;
    exec(webpackCommand, (tscError, tscStdout, tscStderr) => {
        if (tscError) {
            console.error(`Error during TypeScript transpilation: ${tscError}`);
            return;
        }
        console.log('\x1b[0;37mBuild complete...\x1b[0m');
        console.log();
        console.log(`\x1b[0;35mReady to run:\x1b[0m`);
        console.log(`\x1b[0;33mlasrctl test inputs\x1b[0m`);
        console.log();
    });
}
export async function getSecretKeyFromKeyPairFile(keypairFilePath) {
    try {
        let keyPairs = [];
        try {
            console.log('Getting secret key from keypair file');
            const absolutePath = path.resolve(keypairFilePath); // Ensure the path is absolute
            const fileContent = await fsp.readFile(absolutePath, 'utf8');
            keyPairs = JSON.parse(fileContent);
        }
        catch (error) {
            await initializeWallet();
            const absolutePath = path.resolve(keypairFilePath); // Ensure the path is absolute
            const fileContent = await fsp.readFile(absolutePath, 'utf8');
            keyPairs = JSON.parse(fileContent);
        }
        if (keyPairs.length > 0) {
            return keyPairs[0].secret_key;
        }
        else {
            new Error('No keypairs found in the specified file.');
            return '';
        }
    }
    catch (error) {
        console.error(`Failed to retrieve the secret key: ${error}`);
        throw error;
    }
}
export async function getAddressFromKeyPairFile(keypairFilePath) {
    try {
        console.log('Getting address from keypair file');
        const absolutePath = path.resolve(keypairFilePath); // Ensure the path is absolute
        const fileContent = await fsp.readFile(absolutePath, 'utf8');
        const keyPairs = JSON.parse(fileContent);
        if (keyPairs.length > 0) {
            return keyPairs[0].address;
        }
        else {
            new Error('No keypairs found in the specified file.');
            return '';
        }
    }
    catch (error) {
        console.error(`Failed to retrieve the secret key: ${error}`);
        throw error;
    }
}
export async function registerProgram(cid, secretKey, network) {
    try {
        process.env.LASR_RPC_URL = getRPCForNetwork(network);
        process.env.VIPFS_ADDRESS = getIPFSForNetwork(network);
        const command = `./build/lasr_cli wallet register-program --from-secret-key --secret-key "${secretKey}" --cid "${cid}"`;
        return await runCommand(command);
    }
    catch (e) {
        throw new Error(`Failed to register program: ${e}`);
    }
}
export const getSecretKey = async (secretKeyPath, secretKey) => {
    if (secretKey)
        return secretKey;
    if (!fs.existsSync('.lasr/wallet/keypair.json')) {
        console.log('\x1b[0;33mInitializing wallet...\x1b[0m');
        await initializeWallet();
    }
    else {
        console.log('\x1b[0;33mUsing existing keypair...\x1b[0m');
    }
    let retrievedSecretKey;
    const keypairPath = '.lasr/wallet/keypair.json';
    retrievedSecretKey = await getSecretKeyFromKeyPairFile(String(keypairPath));
    return retrievedSecretKey;
};
export async function callCreate(programAddress, symbol, name, initializedSupply, totalSupply, recipientAddress, network, secretKey, inputs) {
    if (!programAddress ||
        !symbol ||
        !name ||
        !initializedSupply ||
        !recipientAddress ||
        !totalSupply ||
        !secretKey) {
        throw new Error(`programAddress (${programAddress}), symbol (${symbol}), name (${name}), initializedSupply (${initializedSupply}), totalSupply(${totalSupply}), and secretKey are required to call create.`);
    }
    let inputsStr = JSON.stringify(JSON.parse(`{"name":"${name}","symbol":"${symbol}","initializedSupply":"${initializedSupply}","totalSupply":"${totalSupply}"${`,"to":"${recipientAddress}"`}}`));
    if (inputs) {
        const parsed = JSON.parse(inputsStr);
        const parsedInputs = JSON.parse(inputs);
        inputsStr = JSON.stringify({ ...parsed, ...parsedInputs });
    }
    process.env.LASR_RPC_URL = getRPCForNetwork(network);
    process.env.VIPFS_ADDRESS = getIPFSForNetwork(network);
    const command = `./build/lasr_cli wallet call --from-secret-key --secret-key "${secretKey}" --op "create" --inputs '${inputsStr}' --to "${programAddress}" --content-namespace "${programAddress}"`;
    console.log({ command });
    return await runCommand(command);
}
export async function sendTokens(programAddress, recipientAddress, amount, secretKey, network) {
    if (!programAddress || !recipientAddress || !amount || !secretKey) {
        throw new Error(`programAddress (${programAddress}), recipientAddress (${recipientAddress}), amount (${amount}), and secretKey are required to call create.`);
    }
    process.env.LASR_RPC_URL = getRPCForNetwork(network);
    process.env.VIPFS_ADDRESS = getIPFSForNetwork(network);
    const command = `./build/lasr_cli wallet send --to ${recipientAddress} -c ${programAddress} --value ${amount} -u verse --from-secret-key --secret-key "${secretKey}"`;
    return await runCommand(command);
}
export async function callProgram(programAddress, op, inputs, network, secretKey) {
    if (!programAddress || !op || !inputs || !secretKey) {
        throw new Error(`programAddress (${programAddress}), op (${op}), inputs (${inputs}), and secretKey are required to call create.`);
    }
    process.env.LASR_RPC_URL = getRPCForNetwork(network);
    process.env.VIPFS_ADDRESS = getIPFSForNetwork(network);
    const command = `./build/lasr_cli wallet call --from-secret-key --secret-key "${secretKey}" --op ${op} --inputs '${inputs}' --to ${programAddress} --content-namespace ${programAddress}`;
    return await runCommand(command);
}
export function runTestProcess(inputJsonPath, target = 'node') {
    return new Promise((resolve, reject) => {
        let scriptDir = isInstalledPackage ? installedPackagePath : process.cwd();
        const testScriptPath = path.resolve(scriptDir, 'scripts', target === 'node' ? 'test-node.sh' : 'test-wasm.sh');
        const testProcess = spawn('bash', [testScriptPath, inputJsonPath], {
            stdio: ['inherit', 'inherit', 'pipe'],
        });
        let errorOutput = '';
        testProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        testProcess.on('error', (error) => {
            reject(`Spawn error: ${error}`);
        });
        testProcess.on('exit', (code) => {
            if (code !== 0) {
                reject(`Exited with code ${code}: ${errorOutput}`);
            }
            else {
                resolve(`Test for ${inputJsonPath} passed`);
            }
        });
    });
}
export async function initializeWallet() {
    await runCommand(`./build/lasr_cli wallet new --save`);
    console.log('Wallet initialized and keypair.json created at ./.lasr/wallet/keypair.json');
}
export async function checkWallet(address) {
    try {
        try {
            console.log('Checking wallet...');
            const command = `./build/lasr_cli wallet get-account --address ${address}`;
            await runCommand(command);
        }
        catch (e) {
            console.log('Wallet not initialized. Fauceting funds to initialize wallet...');
            const data = {
                address,
            };
            await axios
                .post(`${FAUCET_URL}/api/faucet/verse`, data)
                .catch((error) => {
                console.error('error fauceting funds');
                throw error;
            });
        }
        console.log('Wallet check successful');
    }
    catch (error) {
        // Handle specific error messages or take actions based on the error
        console.error('Failed to validate keypair file:', error);
        process.exit(1); // Exit the process if the keypair file is not valid or other errors occur
    }
}
