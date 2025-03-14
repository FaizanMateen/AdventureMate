// Update DATA
import axios from "axios";
import { showAlert } from "./alerts";

// type id either 'password' or 'data'
export const updateSettings = async(data,type)=>{
    try{
        const url = type === 'password' 
        ? '/api/v1/users/updateMyPassword':'/api/v1/users/updateMe'
        
        const res = await axios({
            method:'PATCH',
            url,
            data
        });

        if(res.data.status === 'success'){
            showAlert('success',`${type.toUpperCase()} updated successfully!`);
        }
    }catch(err){
        console.log(err)
        showAlert('error',err.response.data.message)
    }
}