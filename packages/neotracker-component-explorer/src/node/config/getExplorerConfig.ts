import * as fs from 'fs-extra';
import * as path from 'path';

import { ExplorerConfig } from '../../types';

// tslint:disable-next-line no-let
let config: ExplorerConfig | undefined;
export const getExplorerConfig = (): ExplorerConfig => {
  if (config !== undefined) {
    return config;
  }

  config = getExplorerConfigInternal();

  return config;
};

const getAbsoluteProxyPath = ({
  configDir,
  key,
  userConfig,
}: {
  readonly configDir: string;
  readonly key: string;
  // tslint:disable-next-line no-any
  readonly userConfig: any;
}): string | undefined =>
  userConfig.proxies === undefined || userConfig.proxies[key] === undefined
    ? undefined
    : path.resolve(configDir, userConfig.proxies[key]);

const getRelativeProxyPath = ({
  configDir,
  key,
  userConfig,
}: {
  readonly configDir: string;
  readonly key: string;
  // tslint:disable-next-line no-any
  readonly userConfig: any;
}): string | undefined => {
  const absolutePath = getAbsoluteProxyPath({ configDir, key, userConfig });

  return absolutePath === undefined ? undefined : path.relative(__dirname, absolutePath);
};

const extractDependencies = (packageFile: string): ReadonlyArray<string> => {
  const packageObj = fs.readJSONSync(packageFile);

  return Object.keys(packageObj.dependencies);
};

const findDependencies = ({
  currentPath,
  configDir,
}: {
  readonly currentPath: string;
  readonly configDir: string;
}): ReadonlyArray<string> => {
  const exists = fs.pathExistsSync(path.join(currentPath, 'package.json'));
  if (exists) {
    return extractDependencies(path.join(currentPath, 'package.json'));
  }
  if (currentPath === configDir) {
    return [];
  }

  return findDependencies({ currentPath: path.resolve(currentPath, '..'), configDir });
};

const getExplorerConfigInternal = (): ExplorerConfig => {
  const configDir = process.cwd();
  const configPath = path.resolve(configDir, 'explorer.config.js');
  const userConfig = require(configPath);
  const componentsDir =
    userConfig.componentsDir === undefined ? path.join('src', 'components') : userConfig.componentsDir;
  const dependencies = findDependencies({ currentPath: path.resolve(configDir, componentsDir), configDir });
  const nodeProxies = getRelativeProxyPath({ configDir, key: 'node', userConfig });
  const browserProxies = getAbsoluteProxyPath({ configDir, key: 'browser', userConfig });

  return {
    configDir,
    meta:
      userConfig.meta === undefined
        ? {
            title: 'Component Explorer',
            name: 'Component Explorer',
            description: 'The best component explorer',
          }
        : userConfig.meta,
    editorConfig: userConfig.editorConfig === undefined ? {} : userConfig.editorConfig,
    componentsDir,
    tsconfig: userConfig.tsconfig === undefined ? 'tsconfig.json' : userConfig.tsconfig,
    serverPort: userConfig.serverPort === undefined ? 4000 : userConfig.serverPort,
    serverHost: userConfig.serverHost === undefined ? 'localhost' : userConfig.serverHost,
    proxies: {
      node: nodeProxies === undefined ? [] : require(nodeProxies),
      browser: browserProxies,
    },
    dependencies,
  };
};
