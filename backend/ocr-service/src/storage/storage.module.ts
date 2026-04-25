import { Module } from "@nestjs/common";
import { StorageReader } from "./storage.reader";

@Module({
    providers: [StorageReader],
    exports: [StorageReader],
})
export class StorageModule { }
