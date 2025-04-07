use anchor_lang::prelude::*;
//use solana_program::sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID};
//use solana_program::ed25519_program;
use solana_program::account_info::AccountInfo;
use solana_program::program_error::ProgramError;

#[derive(Accounts)]
pub struct VerifySignature<'info> {
    /// CHECK: This is the sysvar instructions account, manually verified
    pub instructions: AccountInfo<'info>,
}


pub fn verify_signature(
    instructions: &AccountInfo,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<bool> {
    let mut signature_verified = false;

    //msg!(" Checking Sysvar Instructions Account...");
    //msg!("Instructions Sysvar Key: {:?}", instructions.key());

    for i in 0..instructions.data_len() {
        let instruction = match solana_program::sysvar::instructions::load_instruction_at_checked(
            i,
            instructions,
        ) {
            Ok(instr) => instr,
            Err(_) => {
                //msg!("Failed to load instruction at index {}", i);
                continue;
            }
        };

        msg!("🔍 Checking instruction {}: Program ID {:?}",i,instruction.program_id);

        if instruction.program_id != solana_program::ed25519_program::id() {
            //msg!("Skipping non-Ed25519 instruction.");
            continue;
        }

        let sig_data = &instruction.data;

        if sig_data.len() < 96 {
            //msg!("Signature data too short! Length: {}", sig_data.len());
            continue;
        }

        let signed_pubkey = match <[u8; 32]>::try_from(&sig_data[64..96]) {
            Ok(pk) => Pubkey::from(pk),
            Err(_) => {
                //msg!(" Failed to extract public key from signature data!");
                continue;
            }
        };

        //msg!("SIG DAT: {:?}", sig_data);
        //msg!(" Extracted Public Key: {:?}", signed_pubkey);
        //msg!(" Expected Signer: {:?}", expected_signer);

        if signed_pubkey != *expected_signer {
            //msg!("Skipping: Public key does not match expected signer.");
            continue;
        }

        let signed_message = &sig_data[96..];

        //msg!("Extracted Signed Message (Hex): {:x?}", signed_message);
        //msg!(" Expected Message (Hex): {:x?}", expected_message);

        if signed_message != expected_message {
            msg!(" Skipping: Signed message does not match expected message.");
            continue;
        }

        msg!("Successfully verified Ed25519 signature from expected signer!");
        signature_verified = true;
        break;
    }

    if !signature_verified {
        msg!(" No valid Ed25519 signature found!");
        return Err(ProgramError::InvalidInstructionData.into());
    }

    Ok(true)
}