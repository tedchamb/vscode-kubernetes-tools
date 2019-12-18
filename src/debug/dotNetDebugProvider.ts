import * as path from "path";
import * as vscode from "vscode";

import { IDebugProvider, PortInfo } from "./debugProvider";
import { ProcessInfo } from "./debugUtils";
import * as extensionUtils from "../extensionUtils";
import { Kubectl } from "../kubectl";
import { kubeChannel } from "../kubeChannel";
import { IDockerfile } from "../docker/parser";
import { Dictionary } from "../utils/dictionary";

// Use the csharp debugger extension provided by Microsoft for csharp debugging.
const defaultDotnetDebuggerExtensionId = "ms-vscode.csharp";
const defaultDotnetDebuggerExtension = "C# for Visual Studio Code";

const defaultDotnetDebuggerConfigType = "dotnet";

export class DotNetDebugProvider implements IDebugProvider {
    public getDebuggerType(): string {
        return defaultDotnetDebuggerConfigType;
    }

    public async isDebuggerInstalled(): Promise<boolean> {
        if (vscode.extensions.getExtension(defaultDotnetDebuggerExtensionId)) {
            return true;
        }
        const answer = await vscode.window.showInformationMessage(`Dotnet debugging requires the '${defaultDotnetDebuggerExtension}' extension. Would you like to install it now?`, "Install Now");
        if (answer === "Install Now") {
            return await extensionUtils.installVscodeExtension(defaultDotnetDebuggerExtensionId);
        }
        return false;
    }

    public async startDebugging(workspaceFolder: string, _sessionName: string, _port: number | undefined, pod: string, pidToDebug: number | undefined): Promise<boolean> {
        const processId = pidToDebug ? pidToDebug.toString() : "${command:pickRemoteProcess}";
        const debugConfiguration = {
            name: ".NET Core Kubernetes Attach",
            type: "coreclr",
            request: "attach",
            processId: processId,
            pipeTransport: {
                pipeProgram: "kubectl",
                pipeArgs: [ "exec", "-i", pod, "--" ],
                debuggerPath: "/vsdbg/vsdbg",
                pipeCwd: "${workspaceRoot}",
                quoteArgs: false
            }
        };
        const currentFolder = (vscode.workspace.workspaceFolders || []).find((folder) => folder.name === path.basename(workspaceFolder));
        const result = await vscode.debug.startDebugging(currentFolder, debugConfiguration);
        if (!result) {
           kubeChannel.showOutput(`${defaultDotnetDebuggerConfigType} debug attach failed for pod ${pod}.\nSee https://github.com/Azure/vscode-kubernetes-tools/blob/master/debug-on-kubernetes.md for troubleshooting.`, "Failed to attach");
        }
        return result;
    }

    public isSupportedImage(_baseImage: string): boolean {
        // todo: add support for debug from file
        return false;
    }

    public async resolvePortsFromFile(_dockerfile: IDockerfile, _env: Dictionary<string>): Promise<PortInfo | undefined> {
        return undefined;
    }

    public async resolvePortsFromContainer(_kubectl: Kubectl, _pod: string, _podNamespace: string | undefined, _container: string): Promise<PortInfo | undefined> {
        return undefined;
    }

    public filterSupportedProcesses(processes: ProcessInfo[]): ProcessInfo[] | undefined {
        return processes.filter((processInfo) => (processInfo.command.toLowerCase().startsWith('dotnet ') ||
                                                  processInfo.command.indexOf('/dotnet ') >= 0)); // full path
    }

    public isPortRequired(): boolean {
        return false;
    }
}
