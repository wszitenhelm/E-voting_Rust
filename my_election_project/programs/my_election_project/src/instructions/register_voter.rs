use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::errors::ErrorCode;
use crate::verify_signature::verify_signature;


#[derive(Accounts)]
#[instruction(voter_public_key: Pubkey)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    #[account(init_if_needed, payer = user, space = 8 + 256, seeds = [b"voter", voter_public_key.as_ref()], bump)]
    pub voter: Account<'info, Voter>,
    #[account(mut, signer)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn register_voter(ctx: Context<RegisterVoter>, voter_public_key: Pubkey, voter_stake: u64) -> Result<()> {
    let election = &mut ctx.accounts.election;
    
    // Ensure election is not active
    if election.is_active {
        return Err(ErrorCode::VotingAlreadyStarted.into());
    }

    // Ensure the user calling the function is the Voting Authority (VA)
    if election.voting_authority != *ctx.accounts.user.key {
        return Err(ErrorCode::Unauthorized.into());
    }

    // Ensure PDA is correctly derived (for debugging & verification)
    let (expected_voter_pda, _bump) =
        Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], &crate::ID);

    if expected_voter_pda != ctx.accounts.voter.key() {
        return Err(ErrorCode::InvalidPDA.into());
    }

    // A newly initialized PDA (via init_if_needed) will have voter_address set to Pubkey::default().
    // If the PDA already existed, then voter_address would already contain a voter's public key.
    //  **Check if voter PDA is already registered**
    if ctx.accounts.voter.voter_address != Pubkey::default() {
        return Err(ErrorCode::VoterAlreadyRegistered.into());
    }


    let expected_signer = election.voting_authority;
    let mut expected_message = Vec::new();
    expected_message.extend_from_slice(&voter_public_key.to_bytes());
    expected_message.extend_from_slice(&voter_stake.to_le_bytes());
    expected_message.extend_from_slice(election.election_id.as_bytes());

    verify_signature(&ctx.accounts.instructions_sysvar, &expected_signer, &expected_message)?;
    
    let (expected_voter_pda, _) = Pubkey::find_program_address(&[b"voter", voter_public_key.as_ref()], ctx.program_id);

    msg!("Correct Expected Voter PDA: {:?}", expected_voter_pda);
    msg!("Voter PDA from Context: {:?}", ctx.accounts.voter.key());

    // Register the voter after verification
    let voter = &mut ctx.accounts.voter;
    voter.voter_address = voter_public_key;
    voter.has_committed = false;
    voter.has_revealed = false;
    voter.commitment = Vec::new();
    voter.voter_stake = voter_stake;
    voter.encrypted_vote = None;

    msg!("Voter's stake: {:?}", voter.voter_stake);

    Ok(())
}