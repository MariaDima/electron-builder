import BluebirdPromise from "bluebird-lst"
import { DIR_TARGET, Platform } from "electron-builder"
import { copy, move, remove, unlink } from "fs-extra-p"
import * as path from "path"
import { CheckingMacPackager } from "../helpers/CheckingPackager"
import { app } from "../helpers/packTester"

async function assertIcon(platformPackager: CheckingMacPackager) {
  const file = await platformPackager.getIconPath()
  expect(file).toBeDefined()

  const result = await platformPackager.resolveIcon([file!!], "set")
  result.forEach(it => {
    it.file = path.basename(it.file)
  })
  expect(result).toMatchSnapshot()
}

test.ifMac.ifAll("icon set", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => BluebirdPromise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
    ]),
    packed: () => assertIcon(platformPackager!!),
  })()
})

test.ifMac.ifAll("custom icon set", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    config: {
      mac: {
        icon: "customIconSet",
      },
    },
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => BluebirdPromise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
      move(path.join(projectDir, "build", "icons"), path.join(projectDir, "customIconSet")),
    ]),
    packed: () => assertIcon(platformPackager!!),
  })()
})

test.ifMac.ifAll("custom icon set with only 512 and 128", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    config: {
      mac: {
        icon: "..",
      },
    },
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => Promise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
      copy(path.join(projectDir, "build", "icons", "512x512.png"), path.join(projectDir, "512x512.png")),
      copy(path.join(projectDir, "build", "icons", "128x128.png"), path.join(projectDir, "128x128.png")),
    ]),
    packed: () => assertIcon(platformPackager!!),
  })()
})

test.ifMac.ifAll("png icon", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    config: {
      mac: {
        icon: "icons/512x512.png",
      },
    },
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => Promise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
    ]),
    packed: () => assertIcon(platformPackager!!),
  })()
})

test.ifMac.ifAll("default png icon", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => BluebirdPromise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
      copy(path.join(projectDir, "build", "icons", "512x512.png"), path.join(projectDir, "build", "icon.png"))
        .then(() => remove(path.join(projectDir, "build", "icons")))
    ]),
    packed: () => assertIcon(platformPackager!!),
  })()
})

test.ifMac.ifAll("png icon small", () => {
  let platformPackager: CheckingMacPackager | null = null
  return app({
    targets: Platform.MAC.createTarget(DIR_TARGET),
    config: {
      mac: {
        icon: "icons/128x128.png",
      },
    },
    platformPackagerFactory: packager => platformPackager = new CheckingMacPackager(packager)
  }, {
    projectDirCreated: projectDir => BluebirdPromise.all([
      unlink(path.join(projectDir, "build", "icon.icns")),
      unlink(path.join(projectDir, "build", "icon.ico")),
    ]),
    packed: async () => {
      try {
        await platformPackager!!.getIconPath()
      }
      catch (e) {
        expect(e.message).toMatch(/must be at least 512x512/)
        return
      }

      throw new Error("error expected")
    },
  })()
})