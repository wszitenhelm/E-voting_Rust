use anchor_lang::prelude::*;
use crate::state::Election;
use crate::errors::ErrorCode;
use crate::instructions::verify_signature;

#[derive(Accounts)]
pub struct SetEncryptionKey<'info> {
    #[account(mut)] // Ensure only the admin can modify it
    pub election: Account<'info, Election>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    /// CHECK: Required for Ed25519 signature verification
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn set_encryption_key(ctx: Context<SetEncryptionKey>, the_key: Pubkey) -> Result<()> {
    let election = &mut ctx.accounts.election;
    
    require!(ctx.accounts.user.key == &election.voting_authority, ErrorCode::Unauthorized);

    // Ensure the key is not already set (can be set only once)
    require!(election.va_encryption_key == Pubkey::default(), ErrorCode::EncryptionKeyAlreadySet);

    // Construct the signed message
    let election_id = election.election_id.as_bytes();
    let message = [election_id, the_key.as_ref()].concat();

    // Verify VA's signature
    // verify_signature(
    //     &ctx.accounts.instructions_sysvar,
    //     &election.voting_authority,
    //     &message,
    // )?;

    election.va_encryption_key = the_key;
    
    Ok(())
}