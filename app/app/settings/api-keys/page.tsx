import { listApiKeysForSession } from "@/app/app/settings/api-keys/actions";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";

export default async function ApiKeysSettingsPage() {
  const keys = await listApiKeysForSession();

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">API keys</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Authenticate to the public API with{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">Authorization: Bearer …</code>
        </p>
      </div>
      <ApiKeysPanel keys={keys} />
    </div>
  );
}
