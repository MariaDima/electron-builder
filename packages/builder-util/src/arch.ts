export enum Arch {
  ia32, x64, armv7l, arm64
}

export type ArchType = "x64" | "ia32" | "armv7l" | "arm64"

export function toLinuxArchString(arch: Arch): string {
  switch (arch) {
    case Arch.x64:
      return "amd64"
    case Arch.ia32:
      return "i386"
    case Arch.armv7l:
      return "armv7l"
    case Arch.arm64:
      return "arm64"

    default:
      throw new Error(`Unsupported arch ${arch}`)
  }
}

export function getArchSuffix(arch: Arch): string {
  return arch === Arch.x64 ? "" : `-${Arch[arch]}`
}

export function archFromString(name: string): Arch {
  switch (name) {
    case "x64":
      return Arch.x64
    case "ia32":
      return Arch.ia32
    case "arm64":
      return Arch.arm64
    case "armv7l":
      return Arch.armv7l

    default:
      throw new Error(`Unsupported arch ${name}`)
  }
}