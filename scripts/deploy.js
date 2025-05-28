const { ethers } = require('hardhat');

async function main() {
  try {
    console.log('\n🚀 Initializing deployment of MockUSDC and TuitionEscrow contracts...\n');

    // Get deployer signer
    const [deployer] = await ethers.getSigners();
    console.log('👤 Deployer address:', deployer.address);

    // Check deployer balance
    const initialBalance = await ethers.provider.getBalance(deployer.address);
    console.log('💰 Initial balance:', ethers.formatEther(initialBalance), 'EDU');
    if (initialBalance == 0) {
      throw new Error('Deployer account has insufficient funds');
    }

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log('🌐 Network:', network.name);
    console.log('⛓️  Chain ID:', network.chainId);

    // --- Deploy MockUSDC ---
    console.log('\n📄 Deploying MockUSDC...');
    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log('✅ MockUSDC deployed at:', usdcAddress);

    // Mint some mUSDC to deployer
    const mintAmount = ethers.parseUnits('1000000', 6); // 1,000,000 mUSDC
    const tx = await mockUSDC.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log(`🪙 Minted 1,000,000 mUSDC to ${deployer.address}`);

    // --- Deploy TuitionEscrow ---
    console.log('\n📄 Deploying TuitionEscrow...');
    const TuitionEscrow = await ethers.getContractFactory('TuitionEscrow');
    const tuitionEscrow = await TuitionEscrow.deploy(usdcAddress);
    await tuitionEscrow.waitForDeployment();
    const escrowAddress = await tuitionEscrow.getAddress();
    console.log('✅ TuitionEscrow deployed at:', escrowAddress);

    // Final deployer balance
    const finalBalance = await ethers.provider.getBalance(deployer.address);

    console.log('\n📊 Deployment Summary:');
    console.log('🏦 MockUSDC Address:', usdcAddress);
    console.log('🎓 TuitionEscrow Address:', escrowAddress);
    console.log('💰 Final Balance:', ethers.formatEther(finalBalance), 'ETH');

    return {
      usdcAddress,
      escrowAddress,
      finalBalance: ethers.formatEther(finalBalance),
    };

  } catch (error) {
    console.error('\n❌ Deployment failed!');
    console.error('🚨 Error:', error.message);
    if (error.code === 'NETWORK_ERROR') {
      console.error('🌐 Network issue detected.');
    }
    if (error.code === 'CONTRACT_CALL_EXCEPTION') {
      console.error('🛠 Contract call failed. Double-check your constructor or mint logic.');
    }
    throw error;
  }
}

// Run deployment
main()
  .then((info) => {
    console.log('\n✅ Deployment completed!');
    console.log('📋 Deployment Info:', info);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error during deployment:', error);
    process.exit(1);
  });
