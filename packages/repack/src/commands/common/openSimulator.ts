import { execSync } from 'node:child_process';
import { isCancel, log, select } from '@clack/prompts';

interface Simulator {
  name: string;
  udid: string;
  state: string;
  isAvailable: boolean;
}

export async function openSimulator() {
  try {
    // Get list of available simulators
    const devices = execSync(
      'xcrun simctl list devices available --json'
    ).toString();
    const parsedDevices = JSON.parse(devices);
    const runtimes = Object.keys(parsedDevices.devices);

    // Collect all available simulators
    const availableSimulators: Simulator[] = [];
    const runningSimulators: Simulator[] = [];

    for (const runtime of runtimes) {
      const simulators = parsedDevices.devices[runtime];
      simulators.forEach((sim: any) => {
        if (sim.isAvailable !== false) {
          // Add if simulator is available
          const simulator = {
            name: `${sim.name} (${runtime})`,
            udid: sim.udid,
            state: sim.state,
            isAvailable: true,
          };

          if (sim.state !== 'Shutdown') {
            runningSimulators.push(simulator);
          } else {
            availableSimulators.push(simulator);
          }
        }
      });
    }

    // Log running simulators
    if (runningSimulators.length > 0) {
      log.info('Running simulators:');
      runningSimulators.forEach((sim) => {
        log.success(`  • ${sim.name}`);
      });
      log.info(''); // Empty line for better readability
    }

    if (availableSimulators.length === 0) {
      throw new Error('No available (shutdown) iOS Simulators found');
    }

    // Show prompt to select simulator (only showing shutdown simulators)
    const selectedSimulator = await select({
      message: 'Select an iOS Simulator',
      options: availableSimulators.map((sim) => ({
        label: sim.name,
        value: sim.udid,
      })),
    });

    if (isCancel(selectedSimulator)) {
      throw new Error('No iOS Simulator selected');
    }

    // Boot the simulator
    execSync(`xcrun simctl boot ${selectedSimulator}`);
    // Open Simulator.app
    execSync('open -a Simulator');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to open iOS Simulator: ${error.message}`);
    }
    throw error;
  }
}
