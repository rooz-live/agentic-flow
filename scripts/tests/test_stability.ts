import { guarded, drain, config, reset } from '../src/runtime/processGovernor';

async function main() {
  console.log('🧪 Starting Stability Test (Concurrent Guarded Mode)...');
  console.log('   Governor Config:', config);

  reset(); 

  const tasks = Array.from({ length: 30 }, (_, i) => i);
  let activeCount = 0;
  let maxConcurrency = 0;

  const worker = async (id: number) => {
    return guarded(async () => {
      activeCount++;
      maxConcurrency = Math.max(maxConcurrency, activeCount);
      // Simulate variable work
      await new Promise(resolve => setTimeout(resolve, 100));
      activeCount--;
      return id;
    });
  };

  console.log(`   Spawning ${tasks.length} concurrent guarded tasks...`);
  
  const start = Date.now();
  await Promise.all(tasks.map(id => worker(id)));
  const duration = Date.now() - start;

  console.log(`✅ Test Complete in ${duration}ms`);
  console.log(`   Max Concurrency Observed: ${maxConcurrency}`);
  console.log(`   Configured Limit: ${config.AF_MAX_WIP}`);
  
  if (maxConcurrency > config.AF_MAX_WIP) {
      console.error('❌ WIP Limit Exceeded!');
      process.exit(1);
  } else if (maxConcurrency === config.AF_MAX_WIP) {
      console.log('✅ WIP Limit Respected (Hit Max)');
  } else {
      console.log(`⚠️ WIP Limit Not Reached (Peaked at ${maxConcurrency})`);
  }
}

main().catch(console.error);
