import * as path from "path";
import * as vscode from "vscode";

import { IDebugProvider, PortInfo } from "./debugProvider";
import * as debugUtils from "./debugUtils";
import * as extensionUtils from "../extensionUtils";
import { Kubectl } from "../kubectl";
import { IDockerfile } from "../docker/parser";
import { Dictionary } from "../utils/dictionary";
import { config } from "shelljs";

// Use the csharp debugger extension provided by Microsoft for csharp debugging.
const defaultDotNetDebuggerExtensionId = "ms-vscode.csharp";
const defaultDotNetDebuggerExtension = "C# for Visual Studio Code";

const defaultDotNetDebuggerConfigType = "dotnet";

export class DotNetDebugProvider implements IDebugProvider {
    public getDebuggerType(): string {
        return defaultDotNetDebuggerConfigType;
    }

    public async isDebuggerInstalled(): Promise<boolean> {
        if (vscode.extensions.getExtension(defaultDotNetDebuggerExtensionId)) {
            return true;
        }
        const answer = await vscode.window.showInformationMessage(`DotNet debugging requires the '${defaultDotNetDebuggerExtension}' extension. Would you like to install it now?`, "Install Now");
        if (answer === "Install Now") {
            return await extensionUtils.installVscodeExtension(defaultDotNetDebuggerExtensionId);
        }
        return false;
    }

    public async startDebugging(workspaceFolder: string, sessionName: string, port: number, pod: string): Promise<boolean> {
        const debugConfiguration =         {
            "name": ".NET Core Kubernetes Attach",
            "type": "coreclr",
            "request": "attach",
            "processId": "${command:pickRemoteProcess}",
            "pipeTransport": {
                "pipeProgram": "kubectl",
                "pipeArgs": [ "exec", "-i", pod, "--" ],
                "debuggerPath": "/vsdbg/vsdbg",
                "pipeCwd": "${workspaceRoot}",
                "quoteArgs": false
            }
        };
        const currentFolder = (vscode.workspace.workspaceFolders || []).find((folder) => folder.name === path.basename(workspaceFolder));
        return await vscode.debug.startDebugging(currentFolder, debugConfiguration);
    }

    public isSupportedImage(baseImage: string): boolean {
        if (!baseImage) {
            return false;
        }
        return baseImage.indexOf("dotnet") >= 0
            || baseImage.indexOf("aspnet") >= 0;
    }

    public async resolvePortsFromFile(dockerfile: IDockerfile, env: Dictionary<string>): Promise<PortInfo | undefined> {
        return undefined;
    }

    public async resolvePortsFromContainer(kubectl: Kubectl, pod: string, podNamespace: string | undefined, container: string): Promise<PortInfo | undefined> {
        return undefined;
    }

    public isPortRequired(): boolean {
        return false;
    }
}
