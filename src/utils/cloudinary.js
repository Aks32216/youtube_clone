import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"; 

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        await fs.promises.access(localFilePath);
        const res=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        });
        console.log("File uploaded successfully on cloudinary");
        return res;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export {uploadOnCloudinary};