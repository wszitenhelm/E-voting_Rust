//use std::intrinsics::const_allocate;

use anchor_lang::prelude::*;
use crate::state::{Election, Voter};
use crate::verify_signature::verify_signature;
use crate::{VerifySignature, VerifySignatureBumps};
//use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CommitVote<'info> {
    #[account(mut)]
    pub voter_pda: Account<'info, Voter>, // Voter account (to store the commitment)
    #[account(mut)]
    pub election: Account<'info, Election>, // Election account to access election ID and authority
    #[account(mut, signer)]
    pub user: Signer<'info>,
    /// CHECK: This is the instructions sysvar, which is read-only and required for Ed25519 signature verification.
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>, // System instruction data for verifying signatures
}

pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>) -> Result<()> {
    let voter = &mut ctx.accounts.voter_pda;
    let election = &ctx.accounts.election;
    let user = &ctx.accounts.user;
    let instructions = &ctx.accounts.instructions_sysvar;

    let voter_commiment = &commitment;
    let voting_authority = ctx.accounts.election.voting_authority; // Immutable borrow

    let expected_signer = voting_authority;

    let mut expected_message = Vec::new();
    expected_message.extend_from_slice(&voter.voter_address.to_bytes()); // Voter's public key
    expected_message.extend_from_slice(&voter.voter_stake.to_le_bytes()); // Voter's stake
    expected_message.extend_from_slice(election.election_id.as_bytes()); // Election ID

    // Call the verify_signature function to check if Voter provided correct certficate signed by VA
    // and called Ed25519SigVerify before
   //verify_signature(instructions, &expected_signer, &expected_message)?;

    // verify_signature(
    //     Context::new(&crate::ID, &mut VerifySignature {
    //         instructions: ctx.accounts.instructions_sysvar.clone(),
    //     }, &[], VerifySignatureBumps::default()),
    //     expected_signer,
    //     expected_message
    // )?;

    // Call the verify_signature function to check if Voter signed the hash
    // and called Ed25519SigVerify before
    let expected_signer_voter = voter.voter_address;

    //verify_signature(instructions, &expected_signer_voter, &commitment)?;

    // verify_signature(
    //     Context::new(&crate::ID, &mut VerifySignature {
    //         instructions: ctx.accounts.instructions_sysvar.clone(),
    //     }, &[], VerifySignatureBumps::default()),
    //     expected_signer_voter,
    //     voter_commiment.to_vec()
    // )?;

    // Step 3: Update the Voter account with the commitment and other fields
    voter.commitment = voter_commiment.to_vec();
    voter.has_committed = true; // Mark that the voter has committed their vote

    msg!("Vote committed successfully for voter: {:?}", user.key());
    Ok(())
}
