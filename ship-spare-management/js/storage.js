import { getFirebaseContext } from "./firebase.js";

export async function uploadFile(path, file) {
  const { storage, sdk } = getFirebaseContext();
  if (!storage || !sdk?.ref || !sdk?.uploadBytes || !sdk?.getDownloadURL) {
    throw new Error("Storage is not ready.");
  }

  const fileRef = sdk.ref(storage, path);
  await sdk.uploadBytes(fileRef, file);
  return sdk.getDownloadURL(fileRef);
}
