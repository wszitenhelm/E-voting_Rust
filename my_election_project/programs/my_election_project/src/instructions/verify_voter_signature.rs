use anchor_lang::prelude::*;
use solana_program::{
    account_info::AccountInfo, pubkey::Pubkey, sysvar::instructions::{load_instruction_at_checked, ID as SYSVAR_INSTRUCTIONS_ID}
};
use hex::encode;
use crate::errors::ErrorCode;


#[derive(Accounts)]
pub struct VerifyVoterSignature<'info> {
    /// CHECK: Instructions Sysvar for inspecting transaction
    #[account(address = SYSVAR_INSTRUCTIONS_ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn verify_voter_signature(
    ctx: Context<VerifyVoterSignature>,
    expected_signer: &Pubkey,
    expected_message: &[u8],
) -> Result<()> {
    
    let instruction_sysvar = &ctx.accounts.instructions;
    let instruction_data = instruction_sysvar.try_borrow_data()?;
    let total_instructions = instruction_data.len() / 4;

    msg!("🔹 Total Instructions: {}", total_instructions);

    let expected_message_hex = encode(expected_message);
    let expected_signer_hex = encode(expected_signer);

    for i in 0..total_instructions {
        if let Ok(ix) = load_instruction_at_checked(i as usize, instruction_sysvar) {
            let instruction_hex = encode(&ix.data);
            
            // ✅ If instruction contains both the expected signer and expected message, return success
            if instruction_hex.contains(&expected_message_hex) && instruction_hex.contains(&expected_signer_hex) {
                msg!("✅ Voter signature verification passed.");
                return Ok(());
            }
        } else {
            msg!("❌ Failed to load instruction at index {}", i);
        }
    }

    msg!("❌ No valid Ed25519 instruction found for voter signature.");
    Err(ErrorCode::InvalidInstructionData.into())
}
