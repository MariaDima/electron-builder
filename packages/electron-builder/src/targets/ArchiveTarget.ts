import { Arch, Platform, Target } from "electron-builder-core"
import { log } from "electron-builder-util/out/log"
import * as path from "path"
import { PlatformPackager } from "../platformPackager"
import { archive, tar } from "./archive"

export class ArchiveTarget extends Target {
  readonly options = (<any>this.packager.config)[this.name]
  
  constructor(name: string, readonly outDir: string, private readonly packager: PlatformPackager<any>) {
    super(name)
  }

  async build(appOutDir: string, arch: Arch): Promise<any> {
    const packager = this.packager
    const isMac = packager.platform === Platform.MAC
    const format = this.name
    log(`Building ${isMac ? "macOS " : ""}${format}`)

    // do not specify arch if x64
    const outFile = path.join(this.outDir, packager.expandArtifactNamePattern(this.options, format, arch === Arch.x64 ? null : arch, packager.platform === Platform.LINUX ? "${name}-${version}-${arch}.${ext}" : "${productName}-${version}-${arch}-${os}.${ext}"))
    if (format.startsWith("tar.")) {
      await tar(packager.config.compression, format, outFile, appOutDir, isMac)
    }
    else {
      await archive(packager.config.compression, format, outFile, appOutDir)
    }

    packager.dispatchArtifactCreated(outFile, this, Arch.x64, isMac ? packager.generateName2(format, "mac", true) : packager.generateName(format, arch, true, packager.platform === Platform.WINDOWS ? "win" : null))
  }
}