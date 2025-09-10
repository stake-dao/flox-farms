const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchCurveStrategies() {
  return new Promise((resolve, reject) => {
    const url = 'https://api.stakedao.org/api/strategies/v2/curve/';
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function filterFraxtalFarms(strategies) {
  const fraxtalFarms = [];
  const chainIds = new Set();
  
  // Look for strategies with chain_id 252 (Fraxtal)
  for (const [key, strategy] of Object.entries(strategies)) {
    const name = strategy.name || key;
    const chainId = strategy.chainId || strategy.chain_id;
    chainIds.add(chainId);
    
    // Check if this is a Fraxtal farm by chain_id
    if (chainId === 252 && strategy.vault) {
      fraxtalFarms.push({
        name: name,
        balance_source_address: strategy.vault,
        holding_address: '0x52f541764e6e90eebc5c21ff570de0e2d63766b6'
      });
    }
  }
  
  console.log('Available chain IDs:', Array.from(chainIds).sort((a, b) => a - b));
  return fraxtalFarms;
}

function generateReadmeTable(farms) {
  let table = `## Curve Stake DAO Fraxtal Farms

Users hold tokens from the **Balance Source Address**. The **Holding Address** is where funds are deposited into Curve.

All farms use 18 decimals by default.

| Name | URL | Balance Source Address | Holding Address |
|------|-----|------------------------|-----------------|
`;

  farms.forEach(farm => {
    const stakeDAOLink = `[StakeDAO](https://stakedao.org/yield?search=${farm.balance_source_address})`;
    table += `| ${farm.name} | ${stakeDAOLink} | \`${farm.balance_source_address}\` | \`${farm.holding_address}\` |\n`;
  });

  return table;
}

async function main() {
  try {
    console.log('Fetching Curve strategies data...');
    const strategies = await fetchCurveStrategies();
    
    console.log('Filtering Fraxtal farms...');
    const fraxtalFarms = filterFraxtalFarms(strategies);
    
    const output = {
      curve_fraxtal_farms: fraxtalFarms,
      last_updated: new Date().toISOString()
    };
    
    const outputPath = path.join(process.cwd(), 'curve-fraxtal-farms.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    // Update README with table
    const table = generateReadmeTable(fraxtalFarms);
    const readmePath = path.join(process.cwd(), 'README.md');
    fs.writeFileSync(readmePath, table);
    
    console.log(`Successfully updated ${fraxtalFarms.length} Fraxtal farms in curve-fraxtal-farms.json and README.md`);
    
  } catch (error) {
    console.error('Error updating Curve farms:', error);
    process.exit(1);
  }
}

main();