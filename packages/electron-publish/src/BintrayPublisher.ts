import BluebirdPromise from "bluebird-lst"
import { Arch, InvalidConfigurationError, isEmptyOrSpaces, isTokenCharValid, log, toLinuxArchString } from "builder-util"
import { BintrayOptions, configureRequestOptions, HttpError } from "builder-util-runtime"
import { BintrayClient, Version } from "builder-util-runtime/out/bintray"
import { httpExecutor } from "builder-util/out/nodeHttpExecutor"
import { ClientRequest, RequestOptions } from "http"
import { HttpPublisher, PublishContext, PublishOptions } from "./publisher"

export class BintrayPublisher extends HttpPublisher {
  private _versionPromise: BluebirdPromise<Version>

  private readonly client: BintrayClient

  readonly providerName = "Bintray"

  constructor(context: PublishContext, info: BintrayOptions, private readonly version: string, private readonly options: PublishOptions = {}) {
    super(context)

    let token = info.token
    if (isEmptyOrSpaces(token)) {
      token = process.env.BT_TOKEN
      if (isEmptyOrSpaces(token)) {
        throw new InvalidConfigurationError(`Bintray token is not set, neither programmatically, nor using env "BT_TOKEN" (see https://www.electron.build/configuration/publish#bintrayoptions)`)
      }

      token = token.trim()

      if (!isTokenCharValid(token)) {
        throw new InvalidConfigurationError(`Bintray token (${JSON.stringify(token)}) contains invalid characters, please check env "BT_TOKEN"`)
      }
    }

    this.client = new BintrayClient(info, httpExecutor, this.context.cancellationToken, token)
    this._versionPromise = this.init() as BluebirdPromise<Version>
  }

  private async init(): Promise<Version | null> {
    try {
      return await this.client.getVersion(this.version)
    }
    catch (e) {
      if (e instanceof HttpError && e.statusCode === 404) {
        if (this.options.publish !== "onTagOrDraft") {
          log.info({version: this.version}, "version doesn't exist, creating one")
          return this.client.createVersion(this.version)
        }
        else {
          log.notice({reason: "version doesn't exist", version: this.version}, "skipped publishing")
        }
      }

      throw e
    }
  }

  protected async doUpload(fileName: string, arch: Arch, dataLength: number, requestProcessor: (request: ClientRequest, reject: (error: Error) => void) => void) {
    const version = await this._versionPromise
    if (version == null) {
      log.notice({file: fileName, reason: "version doesn't exist and is not created", version: this.version}, "skipped publishing")
      return
    }

    const options: RequestOptions = {
      hostname: "api.bintray.com",
      path: `/content/${this.client.owner}/${this.client.repo}/${this.client.packageName}/${version.name}/${fileName}`,
      method: "PUT",
      headers: {
        "Content-Length": dataLength,
        "X-Bintray-Override": "1",
        "X-Bintray-Publish": "1",
        "X-Bintray-Debian-Architecture": toLinuxArchString(arch)
      }
    }

    if (this.client.distribution) {
      options.headers = options.headers || {}
      options.headers["X-Bintray-Debian-Distribution"] = this.client.distribution
    }

    if (this.client.component) {
      options.headers = options.headers || {}
      options.headers["X-Bintray-Debian-Component"] = this.client.component
    }

    for (let attemptNumber = 0; ; attemptNumber++) {
      try {
        return await httpExecutor.doApiRequest(configureRequestOptions(options, this.client.auth), this.context.cancellationToken, requestProcessor)
      }
      catch (e) {
        if (attemptNumber < 3 && ((e instanceof HttpError && e.statusCode === 502) || e.code === "EPIPE")) {
          continue
        }

        throw e
      }
    }
  }

  //noinspection JSUnusedGlobalSymbols
  deleteRelease(): Promise<any> {
    if (!this._versionPromise.isFulfilled()) {
      return BluebirdPromise.resolve()
    }

    const version = this._versionPromise.value()
    return version == null ? BluebirdPromise.resolve() : this.client.deleteVersion(version.name)
  }

  toString() {
    return `Bintray (user: ${this.client.user || this.client.owner}, owner: ${this.client.owner},  package: ${this.client.packageName}, repository: ${this.client.repo}, version: ${this.version})`
  }
}