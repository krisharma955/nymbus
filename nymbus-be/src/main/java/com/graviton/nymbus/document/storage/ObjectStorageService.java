package com.graviton.nymbus.document.storage;

public interface ObjectStorageService {
    String upload(String objectKey, byte[] data, String contentType);
    byte[] download(String objectKey);
    void delete(String objectKey);
}
