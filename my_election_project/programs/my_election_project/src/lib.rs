#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

pub use instructions::*;
pub use state::*;
pub use errors::*;

// use instructions::initialize::Initialize;
// use instructions::register_voter::RegisterVoter;
// use instructions::start_election::StartElection;
//use instructions::commit_vote::CommitVote;
//use instructions::end_voting::EndVoting;
//use instructions::get_election_id::GetElectionId;
//use instructions::get_voting_authority_public_key::GetVotingAuthorityPublicKey;


declare_id!("3QcquCXtnJeVNGtiMsjoMXh7TnFyMX4MMVRekdpdXzVS"); // Replace with actual program ID

#[program]
pub mod voting_system {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, election_name: String, voting_authority: Pubkey, election_id: String) -> Result<()> {
        instructions::initialize::initialize(ctx, election_name, voting_authority, election_id)
    }

    pub fn register_voter(ctx: Context<RegisterVoter>, voter_public_key: Pubkey, voter_stake: u64) -> Result<()> {
        instructions::register_voter::register_voter(ctx, voter_public_key, voter_stake)
    }

    pub fn start_election(ctx: Context<StartElection>) -> Result<()> {
        instructions::start_election::start_election(ctx)
    }

    pub fn commit_vote(ctx: Context<CommitVote>, commitment: Vec<u8>) -> Result<()> {
        instructions::commit_vote::commit_vote(ctx, commitment)
    }

    pub fn reveal_vote(ctx: Context<RevealVote>, encrypted_vote: Vec<u8>, nonce: Vec<u8>) -> Result<()> {
        instructions::reveal_vote::reveal_vote(ctx, encrypted_vote, nonce)
    }

    pub fn end_voting(ctx: Context<EndVoting>) -> Result<()> {
        instructions::end_voting::end_voting(ctx)
    }

    pub fn get_election_id(ctx: Context<GetElectionId>) -> Result<String> {
        instructions::get_election_id::get_election_id(ctx)
    }

    pub fn get_voting_authority_public_key(ctx: Context<GetVotingAuthorityPublicKey>) -> Result<Pubkey> {
        instructions::get_voting_authority_public_key::get_voting_authority_public_key(ctx)
    }

    // pub fn verify_signature(ctx: Context<VerifySignature>) -> Result<Pubkey> {
    //     instructions::verify_signature::verify_signature(ctx)
    // }
}