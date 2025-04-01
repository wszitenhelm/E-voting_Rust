/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/voting_program.json`.
 */
export type VotingProgram = {
  "address": "8bP99pZpRyWi7np5oe5uvxfsByNQscFdbwPxhrzuf75i",
  "metadata": {
    "name": "votingProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "endVoting",
      "discriminator": [
        161,
        71,
        151,
        11,
        247,
        132,
        219,
        142
      ],
      "accounts": [
        {
          "name": "election",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "getElectionId",
      "discriminator": [
        243,
        239,
        114,
        185,
        138,
        90,
        209,
        15
      ],
      "accounts": [
        {
          "name": "election",
          "writable": true
        },
        {
          "name": "user",
          "signer": true
        }
      ],
      "args": [],
      "returns": "string"
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "election",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  108,
                  101,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "registeredVoters",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  101,
                  114,
                  101,
                  100,
                  95,
                  118,
                  111,
                  116,
                  101,
                  114,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "election"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "electionName",
          "type": "string"
        },
        {
          "name": "votingAuthority",
          "type": "pubkey"
        },
        {
          "name": "electionId",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerVoter",
      "discriminator": [
        229,
        124,
        185,
        99,
        118,
        51,
        226,
        6
      ],
      "accounts": [
        {
          "name": "election",
          "writable": true
        },
        {
          "name": "registeredVoters",
          "writable": true
        },
        {
          "name": "voter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "voterPublicKey"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "voterPublicKey",
          "type": "pubkey"
        },
        {
          "name": "voterStake",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startVoting",
      "discriminator": [
        68,
        29,
        234,
        70,
        139,
        251,
        237,
        179
      ],
      "accounts": [
        {
          "name": "election",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "election",
      "discriminator": [
        68,
        191,
        164,
        85,
        35,
        105,
        152,
        202
      ]
    },
    {
      "name": "registeredVoters",
      "discriminator": [
        105,
        15,
        176,
        184,
        31,
        50,
        20,
        167
      ]
    },
    {
      "name": "voter",
      "discriminator": [
        241,
        93,
        35,
        191,
        254,
        147,
        17,
        202
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "votingAlreadyStarted",
      "msg": "Voting has already started."
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "You are not authorized to perform this action."
    },
    {
      "code": 6002,
      "name": "resultsNotCommitted",
      "msg": "The results must be committed before ending the voting."
    },
    {
      "code": 6003,
      "name": "voterAlreadyRegistered",
      "msg": "This voter is already registered."
    },
    {
      "code": 6004,
      "name": "invalidPda",
      "msg": "PDA not correct for Voter account."
    },
    {
      "code": 6005,
      "name": "invalidSignature",
      "msg": "Invalid signature"
    },
    {
      "code": 6006,
      "name": "invalidPublicKey",
      "msg": "Invalid Public Key"
    }
  ],
  "types": [
    {
      "name": "election",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "electionId",
            "type": "string"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "votesCommitted",
            "type": "bool"
          },
          {
            "name": "votesRevealed",
            "type": "bool"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "votes",
            "type": {
              "vec": {
                "defined": {
                  "name": "voteOption"
                }
              }
            }
          },
          {
            "name": "votingAuthority",
            "type": "pubkey"
          },
          {
            "name": "registeredVoters",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "registeredVoters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "registeredAddresses",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "voteOption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "voteCount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voterAddress",
            "type": "pubkey"
          },
          {
            "name": "hasCommitted",
            "type": "bool"
          },
          {
            "name": "hasRevealed",
            "type": "bool"
          },
          {
            "name": "commitment",
            "type": "bytes"
          },
          {
            "name": "vote",
            "type": {
              "option": {
                "defined": {
                  "name": "voteOption"
                }
              }
            }
          },
          {
            "name": "voterStake",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
