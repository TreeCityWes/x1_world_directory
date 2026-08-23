export type AssetPack = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

export type Asset = {
  id: string;
  packId: string;
  name: string;
  mimeType: string;
  createdAt: number;
};

export type Tier = {
  id: string;
  label: string;
  color: string;
  text: string;
};

export type Placement = "unranked" | (string & {});

export type TierList = {
  id: string;
  name: string;
  packId: string;
  tiers: Tier[];
  placements: Record<string, Placement>;
  createdAt: number;
  updatedAt: number;
};

export type PackExport = {
  version: 1;
  kind: "asset-pack";
  pack: Omit<AssetPack, "id" | "createdAt" | "updatedAt">;
  assets: Array<{
    name: string;
    mimeType: string;
    dataUrl: string;
  }>;
};
