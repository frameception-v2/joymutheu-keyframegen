"use client";

import { useEffect, useCallback, useState } from "react";
import { ethers } from "ethers";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

function KeyGenerator() {
  const [evmKey, setEvmKey] = useState<{private: string; address: string} | null>(null);
  const [solKey, setSolKey] = useState<{private: string; address: string} | null>(null);
  const [keysVisible, setKeysVisible] = useState(false);

  const generateEVMKey = useCallback(() => {
    const privateKey = crypto.randomBytes(32).toString('hex');
    const wallet = new ethers.Wallet(privateKey);
    setEvmKey({
      private: privateKey,
      address: wallet.address
    });
  }, []);

  const generateSolanaKey = useCallback(() => {
    const keypair = Keypair.generate();
    setSolKey({
      private: bs58.encode(keypair.secretKey),
      address: keypair.publicKey.toString()
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-500">⚠️ Temporary Key Generator</CardTitle>
        <CardDescription className="text-red-300">
          Generated keys should NEVER hold significant funds! 
          This is for testing purposes only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Button onClick={generateEVMKey} variant="outline">
            Generate EVM Key
          </Button>
          {evmKey && (
            <div className="text-xs break-words space-y-1">
              <div className="font-mono">Address: {evmKey.address}</div>
              <div className="flex gap-2 items-center">
                <span className="font-mono">Private: {keysVisible ? evmKey.private : '*'.repeat(64)}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setKeysVisible(!keysVisible)}
                >
                  {keysVisible ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(evmKey.private)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={generateSolanaKey} variant="outline">
            Generate Solana Key
          </Button>
          {solKey && (
            <div className="text-xs break-words space-y-1">
              <div className="font-mono">Address: {solKey.address}</div>
              <div className="flex gap-2 items-center">
                <span className="font-mono">Private: {keysVisible ? solKey.private : '*'.repeat(44)}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setKeysVisible(!keysVisible)}
                >
                  {keysVisible ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(solKey.private)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-red-400">
          🔒 Keys generated client-side - Not stored anywhere!
          <br />
          📜 Open source: github.com/yourusername/keys-lol-frame
        </div>
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <KeyGenerator />
      </div>
    </div>
  );
}
