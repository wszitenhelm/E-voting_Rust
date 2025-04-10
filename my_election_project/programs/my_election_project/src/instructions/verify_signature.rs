use anchor_lang::prelude::*;
use solana_program::{
    account_info::AccountInfo,
    ed25519_program,
    sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID},
    pubkey::Pubkey,
};
use bs58;
use hex::encode;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct VerifySignature<'info> {
    /// CHECK: Instructions Sysvar for inspecting transaction
    #[account(address = SYSVAR_INSTRUCTIONS_ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn verify_signature(
    //accounts: &[AccountInfo],
    ctx: Context<VerifySignature>,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    // msg!("Starting signature verification...");

    msg!("🔹 VERIFY_SIGANTURE");
    msg!("🔹 messege expected {:?}", expected_message);
    msg!("🔹 messege expected hex {:?}", hex::encode(expected_message));

    msg!("🔹 signer expected {:?}", expected_signer);
    msg!("🔹 signer expected hex {:?}", hex::encode(expected_signer));



    let instruction_sysvar = &ctx.accounts.instructions;

    let instruction_data = instruction_sysvar.try_borrow_data()?;
    let total_instructions = instruction_data.len() / 4; // Each instruction index is 4 bytes

    msg!("🔹 Total Instructions: {}", total_instructions);

    let expected_message_hex = encode(expected_message);
    let expected_signer_hex = encode(expected_signer);

    for i in 0..total_instructions {
        if let Ok(ix) = load_instruction_at_checked(i as usize, instruction_sysvar) {
            msg!("🔹 Instruction {}: {:?}", i, ix);
            msg!("🔹 Instruction {} (Hex): {}", i, encode(&ix.data));
            let instruction_hex = encode(&ix.data);
            if instruction_hex.contains(&expected_message_hex) && instruction_hex.contains(&expected_signer_hex) {
                msg!("✅ Signature verification passed.");
                return Ok(());
            }

        } 
        // else {
        //     msg!("❌ Failed to load instruction at index {}", i);
        // }
    }

    //msg!("🔹 Ed25519 TEST FILE Data Hex:", Buffer.from(account.data).toString("hex"));
    //msg!("🔹 VERIFY Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&*data));
    //msg!("🔹 Raw Ed25519 Instruction Data (hex): {:?}", bs58::encode(data));


    // for account in accounts.iter() {
    //     let data = account.data.borrow(); // Explicitly borrow

    //     msg!(account.data);

    //     //msg!("🔹 Ed25519 TEST FILE Data Hex:", Buffer.from(account.data).toString("hex"));
    //     msg!("🔹 VERIFY Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&*data));
    //     //msg!("🔹 Raw Ed25519 Instruction Data (hex): {:?}", bs58::encode(data));
    // }
    

    //     let data = account.data.as_ref();
    //     let data_borrowed = data.borrow();
    //     //msg!("🔹 Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&data_borrowed));

    //     // Hardcoded offsets based on observed format
    //     let pubkey_offset = 222; // Adjusted offset for pubkey
    //     let msg_offset = 288; // Adjusted offset for message
    //     let pubkey_length = 32;
    //     let msg_length = expected_message.len();

    //     if data_borrowed.len() < msg_offset + msg_length {
    //         msg!("❌ Data length mismatch.");
    //         continue;
    //     }

    //     let extracted_pubkey = &data_borrowed[pubkey_offset..pubkey_offset + pubkey_length];
    //     let extracted_message = &data_borrowed[msg_offset..msg_offset + msg_length];

    //     msg!("📌 Extracted Public Key: {:?}", hex::encode(extracted_pubkey));
    //     msg!("📌 Extracted Message: {:?}", hex::encode(extracted_message));
    //     msg!("✅ Expected Public Key: {:?}", hex::encode(expected_signer.as_ref()));
    //     msg!("✅ Expected Message: {:?}", hex::encode(expected_message));

    //     if extracted_pubkey == expected_signer.as_ref() && extracted_message == expected_message {
    //         msg!("✅ Signature verification passed.");
    //         //return Ok(());
    //     }
    // }

    msg!("❌ No valid Ed25519 instruction found matching the expected signer and message.");
    Err(ProgramError::InvalidInstructionData.into())

    //return Ok(());
}





// pub fn verify_signature(
//     accounts: &[AccountInfo],
//     expected_signer: &Pubkey,
//     expected_message: &[u8],
// ) -> Result<()> {
//     msg!("Starting signature verification...");

//     //msg!("🔹 Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&*accounts[0].data.borrow()));

//     for (i, account) in accounts.iter().enumerate() {
//         msg!("🔹 [{}] Raw Ed25519 Instruction Data (hex): {:?}", i, hex::encode(&*account.data.borrow()));

//         // if account.owner == &ed25519_program::ID {
//         //     msg!("🔹 [{}] Raw Ed25519 Instruction Data (hex): {:?}", i, hex::encode(&*account.data.borrow()));
//         // }
//     }
    


//     for instruction in accounts.iter() {
//         // if instruction.owner != &ed25519_program::ID {
//         //     continue; // Skip non-Ed25519 instructions
//         // }

//         let data = instruction.data.as_ref();
//         let data_borrowed = data.borrow();

//         msg!(
//             "Raw Ed25519 Instruction Data (hex): {:?}",
//             hex::encode(&*data_borrowed)
//         );

//         // Ensure the data length is valid before extracting anything
//         if data_borrowed.len() < 128 {
//             msg!("❌ Instruction data is too short.");
//             continue;
//         }

//         // Updated offsets based on your provided format
//         let sig_offset = 1;
//         let pubkey_offset = 48 + sig_offset;
//         let msg_offset = pubkey_offset + 32; // Adjusted based on your message structure
//         let pubkey_length = 32;
//         let msg_length = expected_message.len();

//         if data_borrowed.len() < msg_offset + msg_length {
//             msg!("❌ Data length mismatch.");
//             continue;
//         }

//         let extracted_pubkey = &data_borrowed[pubkey_offset..pubkey_offset + pubkey_length];
//         let extracted_message = &data_borrowed[msg_offset..msg_offset + msg_length];

//         msg!("🔹 Extracted Public Key: {:?}", hex::encode(extracted_pubkey));
//         msg!("🔹 Extracted Message: {:?}", hex::encode(extracted_message));
        
//         msg!("✅ Expected Public Key: {:?}", hex::encode(expected_signer.as_ref()));
//         msg!("✅ Expected Message: {:?}", hex::encode(expected_message));
        
//         if extracted_pubkey != expected_signer.as_ref() {
//             msg!("❌ Public key mismatch.");
//             continue;
//         }

//         if extracted_message != expected_message {
//             msg!("❌ Message mismatch.");
//             continue;
//         }

//         msg!("✅ Signature verification passed.");
//         return Ok(()); // Found a valid instruction, return success
//     }

//     msg!("❌ No valid Ed25519 instruction found matching the expected signer and message.");
//     Err(ProgramError::InvalidInstructionData.into())
// }



// pub fn verify_signature(
//     accounts: &[AccountInfo],
//     expected_signer: &Pubkey,
//     expected_message: &[u8],
// ) -> Result<()> {
//     msg!("Starting signature verification...");

//     for (idx, instruction) in accounts.iter().enumerate() {
//         // if instruction.owner != &ed25519_program::ID {
//         //     continue; // Skip non-Ed25519 instructions
//         // }

//         let data = instruction.data.as_ref();
//         msg!("🔍 Checking Ed25519 instruction at index {}", idx);
//         msg!("Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&*data.borrow()));

//         // Assuming fixed offsets and lengths based on your given format
//         let sig_offset = 1;
//         let pubkey_offset = 48 + sig_offset;
//         let msg_offset = 16 + pubkey_offset;
//         let sig_length = 64;
//         let pubkey_length = 32;
//         let msg_length = expected_message.len();

//         let data_borrowed = data.borrow();

//         if data_borrowed.len() < msg_offset + msg_length {
//             msg!("❌ Data length mismatch.");
//             continue;
//         }

//         let extracted_pubkey = &data_borrowed[pubkey_offset..pubkey_offset + pubkey_length];
//         let extracted_message = &data_borrowed[msg_offset..msg_offset + msg_length];

//         msg!("📌 Extracted Public Key: {:?}", hex::encode(extracted_pubkey));
//         msg!("✅ Wanted Message: {:?}", hex::encode(expected_message));
//         msg!("📌 Extracted Message: {:?}", hex::encode(extracted_message));
//         msg!("✅ Wanted Public Key: {:?}", hex::encode(expected_signer));

//         if extracted_pubkey == expected_signer.as_ref() && extracted_message == expected_message {
//             msg!("✅ Signature verification passed.");
//             return Ok(());
//         }
//     }

//     msg!("❌ No valid Ed25519 instruction found matching the expected signer and message.");
//     Err(ProgramError::InvalidInstructionData.into())
// }






// pub fn verify_signature(
//     accounts: &[AccountInfo],
//     expected_signer: &Pubkey,
//     expected_message: &[u8],
// ) -> Result<()> {
//     msg!("Starting signature verification...");

//     let instruction_index = 1; // Assume Ed25519Program is at index 1
//     let instruction = &accounts[instruction_index];

//     if instruction.owner != &ed25519_program::ID {
//         msg!("❌ Instruction at index {} is not an Ed25519 instruction.", instruction_index);
//         return Err(ProgramError::InvalidInstructionData.into());
//     }

//     let data = instruction.data.as_ref();
//     msg!("Raw Ed25519 Instruction Data (hex): {:?}", hex::encode(&*data.borrow()));


//     // Assuming fixed offsets and lengths based on your given format
//     let sig_offset = 1;
//     let pubkey_offset = 48 + sig_offset;
//     let msg_offset = 16 + pubkey_offset;
//     let sig_length = 64;
//     let pubkey_length = 32;
//     let msg_length = expected_message.len();


//     let data_borrowed = data.borrow();
//     let extracted_pubkey = &data_borrowed[pubkey_offset..pubkey_offset + pubkey_length];
//     let extracted_message = &data_borrowed[msg_offset..msg_offset + msg_length];
    

//     if data.len() < msg_offset + msg_length {
//         msg!("❌ Data length mismatch.");
//         return Err(ProgramError::InvalidInstructionData.into());
//     }

//     msg!(" ✅ wanted Public Key: {:?}", hex::encode(extracted_pubkey));
//     msg!("✅  wanted Message: {:?}", hex::encode(extracted_message));
 

//     msg!("📌 Extracted Public Key: {:?}", hex::encode(extracted_pubkey));
//     msg!("📌 Extracted Message: {:?}", hex::encode(extracted_message));

//     if extracted_pubkey != expected_signer.as_ref() {
//         msg!("❌ Public key mismatch.");
//         return Err(ProgramError::InvalidInstructionData.into());
//     }

//     if extracted_message != expected_message {
//         msg!("❌ Message mismatch.");
//         return Err(ProgramError::InvalidInstructionData.into());
//     }

//     msg!("✅ Signature verification passed.");
//     Ok(())
// }






// pub fn verify_signature(
//     ctx: Context<VerifySignature>,
//     expected_signer: Pubkey,
//     expected_message: Vec<u8>,
// ) -> Result<()> {
//     let instructions = &ctx.accounts.instructions;

//     if instructions.key != &SYSVAR_INSTRUCTIONS_ID {
//         msg!("Invalid Instructions Sysvar account.");
//         return Err(ErrorCode::InvalidAccountData.into());
//     }

//     msg!("Reaching here");


//     let mut index = 0;
//     loop {
//         let instruction = match load_instruction_at_checked(index, instructions) {
//             Ok(instr) => instr,
//             Err(_) => break,
//         };

//         if instruction.program_id == ed25519_program::id() {
//             msg!("Found Ed25519Program instruction at index {}.", index);

//             if instruction.data.len() < 96 {
//                 msg!("Ed25519 instruction data too short. Length: {}", instruction.data.len());
//                 return Err(ErrorCode::InvalidInstructionData.into());
//             }

//             let public_key_slice = &instruction.data[64..96];
//             if public_key_slice.len() != 32 {
//                 msg!("Invalid public key length: {}", public_key_slice.len());
//                 return Err(ErrorCode::InvalidInstructionData.into());
//             }

//             let provided_pubkey = Pubkey::try_from(public_key_slice).map_err(|_| {
//                 msg!("Failed to parse public key.");
//                 ErrorCode::InvalidInstructionData
//             })?;

//             let provided_message = &instruction.data[96..];

//             msg!("Expected Signer: {:?}", expected_signer);
//             msg!("Provided Pubkey: {:?}", provided_pubkey);
//             msg!("Expected Message (hex): {:?}", hex::encode(&expected_message));
//             msg!("Provided Message (hex): {:?}", hex::encode(provided_message));

//             if provided_pubkey != expected_signer {
//                 msg!("Public key mismatch! Expected: {:?}, Got: {:?}", expected_signer, provided_pubkey);
//                 return Err(ErrorCode::InvalidArgument.into());
//             }

//             if provided_message != expected_message {
//                 msg!("Message mismatch! Expected: {:?}, Got: {:?}", String::from_utf8_lossy(&expected_message), String::from_utf8_lossy(provided_message));
//                 return Err(ErrorCode::InvalidArgument.into());
//             }

//             msg!("Ed25519 instruction validated successfully!");
//             return Ok(());
//         }

//         index += 1;
//     }

//     msg!("No Ed25519Program instruction found in transaction.");
//     Err(ErrorCode::NotFound.into())
// }





// use anchor_lang::prelude::*;
// use solana_program::account_info::AccountInfo;
// use solana_program::program_error::ProgramError;

// #[derive(Accounts)]
// pub struct VerifySignature<'info> {
//     /// CHECK: This is the sysvar instructions account, manually verified
//     pub instructions: AccountInfo<'info>,
// }


// pub fn verify_signature(
//     instructions: &AccountInfo,
//     expected_signer: &Pubkey,
//     expected_message: &[u8],
// ) -> Result<bool> {
//     let mut signature_verified = false;

//     //msg!(" Checking Sysvar Instructions Account...");
//     //msg!("Instructions Sysvar Key: {:?}", instructions.key());

//     for i in 0..instructions.data_len() {
//         let instruction = match solana_program::sysvar::instructions::load_instruction_at_checked(
//             i,
//             instructions,
//         ) {
//             Ok(instr) => instr,
//             Err(_) => {
//                 //msg!("Failed to load instruction at index {}", i);
//                 continue;
//             }
//         };

//         msg!("🔍 Checking instruction {}: Program ID {:?}",i,instruction.program_id);

//         if instruction.program_id != solana_program::ed25519_program::id() {
//             //msg!("Skipping non-Ed25519 instruction.");
//             continue;
//         }

//         let sig_data = &instruction.data;

//         if sig_data.len() < 96 {
//             //msg!("Signature data too short! Length: {}", sig_data.len());
//             continue;
//         }

//         let signed_pubkey = match <[u8; 32]>::try_from(&sig_data[64..96]) {
//             Ok(pk) => Pubkey::from(pk),
//             Err(_) => {
//                 //msg!(" Failed to extract public key from signature data!");
//                 continue;
//             }
//         };

//         //msg!("SIG DAT: {:?}", sig_data);
//         //msg!(" Extracted Public Key: {:?}", signed_pubkey);
//         //msg!(" Expected Signer: {:?}", expected_signer);

//         if signed_pubkey != *expected_signer {
//             //msg!("Skipping: Public key does not match expected signer.");
//             continue;
//         }

//         let signed_message = &sig_data[96..];

//         //msg!("Extracted Signed Message (Hex): {:x?}", signed_message);
//         //msg!(" Expected Message (Hex): {:x?}", expected_message);

//         if signed_message != expected_message {
//             msg!(" Skipping: Signed message does not match expected message.");
//             continue;
//         }

//         msg!("Successfully verified Ed25519 signature from expected signer!");
//         signature_verified = true;
//         break;
//     }

//     if !signature_verified {
//         msg!(" No valid Ed25519 signature found!");
//         return Err(ProgramError::InvalidInstructionData.into());
//     }

//     Ok(true)
// }




// // use anchor_lang::prelude::*;
// // use solana_program::{
// //     instruction::Instruction,
// //     sysvar::instructions::{get_instruction_relative, ID as INSTRUCTIONS_ID},
// // };

// // pub fn verify_signature(
// //     instructions: &AccountInfo,
// //     expected_signer: &Pubkey,
// //     expected_message: &[u8],
// // ) -> Result<()> {
// //     let current_index = solana_program::sysvar::instructions::load_current_index_checked(instructions)?;

// //     for i in 0..current_index {
// //         if let Ok(ix) = get_instruction_relative(i as i32, instructions) {
// //             if ix.program_id == solana_program::ed25519_program::ID {
// //                 let sig_verified = process_ed25519_verification(&ix, expected_signer, expected_message);
// //                 if sig_verified {
// //                     return Ok(());
// //                 }
// //             }
// //         }
// //     }
// //     Err(ErrorCode::InvalidSignature.into())
// // }

// // fn process_ed25519_verification(ix: &Instruction, expected_signer: &Pubkey, expected_message: &[u8]) -> bool {
// //     true // Needs proper verification logic
// // }
