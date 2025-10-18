
var DotaBuffCP = {

  VERSION: '0.7.1',

  initialized: false,

  initialize: function () {
    this.lineup = [ -1, -1, -1, -1, -1 ];
    this.lineup2 = [ -1, -1, -1, -1, -1 ];
    this.initialized = true;
    // Initialize default roles per slot for both lineups
    this.roles = [];
    var __defaultRoles = ['carry','mid','offlane','softsupport','hardsupport'];
    for (var __r = 0; __r < 10; ++__r) this.roles[__r] = __defaultRoles[__r % 5];
    
  },

  heroId: function (name) {

    for (var i in heroes)
      if (heroes[i].toLowerCase ().indexOf (name.toLowerCase ()) >= 0
        && heroes[i].length === name.length)
        return i;

    return -1;

  },

  heroAbbrLookup: {
    "abaddon": ["avernus"],
    "alchemist": ["razzil"],
    "ancient apparition": ["kaldr", "aa"],
    "anti-mage": ["am"],
    "axe": [],
    "bane": ["atropos"],
    "batrider": [],
    "beastmaster": ["karroch", "rexxar", "bm"],
    "bloodseeker": ["strygwyr", "bs"],
    "bounty hunter": ["gondar", "bh"],
    "brewmaster": ["mangix", "bm"],
    "bristleback": ["rigwarl", "bb"],
    "broodmother": ["bm"],
    "centaur warrunner": ["bradwarden", "cw"],
    "chaos knight": ["ck"],
    "chen": [],
    "clinkz": ["bone"],
    "clockwerk": ["rattletrap", "cw"],
    "crystal maiden": ["rylai", "cm"],
    "dark seer": ["ish", "ds"],
    "dazzle": [],
    "death prophet": ["krobelus", "grobulus", "dp"],
    "disruptor": [],
    "doom": [],
    "dragon knight": ["davion", "dk"],
    "drow ranger": ["traxex", "dr"],
    "earthshaker": ["raigor", "es"],
    "earth spirit": ["kaolin", "es"],
    "elder titan": ["et"],
    "ember spirit": ["xin", "es"],
    "enchantress": ["aiushtha"],
    "enigma": [],
    "faceless void": ["darkterror"],
    "gyrocopter": ["aurel"],
    "huskar": [],
    "invoker": ["kael", "karl", "carl"],
    "io": ["wisp"],
    "jakiro": ["thd"],
    "juggernaut": ["yurnero"],
    "keeper of the light": ["ezalor", "kotl"],
    "kunkka": [],
    "legion commander": ["tresdin", "lc"],
    "leshrac": [],
    "lich": ["ethreain"],
    "lifestealer": ["naix"],
    "lina": [],
    "lion": [],
    "lone druid": ["sylla", "ld"],
    "luna": [],
    "lycan": ["banehallow"],
    "magnus": [],
    "medusa": ["gorgon"],
    "meepo": ["geomancer"],
    "mirana": ["potm"],
    "morphling": [],
    "naga siren": ["slithice", "ns"],
    "natures prophet": ["furion", "np"],
    "necrophos": [],
    "night stalker": ["ns", "balanar"],
    "nyx assassin": ["na"],
    "ogre magi": ["aggron", "om"],
    "omniknight": ["ok"],
    "outworld devourer": ["od", "harbinger"],
    "phantom assassin": ["pa", "mortred"],
    "phantom lancer": ["azwraith", "pl"],
    "phoenix": [],
    "puck": [],
    "pudge": ["butcher"],
    "pugna": [],
    "queen of pain": ["akasha", "qop"],
    "razor": [],
    "riki": [],
    "rubick": [],
    "sand king": ["crixalis", "sk"],
    "shadow demon": ["sd"],
    "shadow fiend": ["nevermore", "sf"],
    "shadow shaman": ["rhasta", "ss"],
    "silencer": ["nortrom"],
    "skywrath mage": ["dragonus", "sm"],
    "slardar": [],
    "sniper": ["kardel"],
    "spectre": ["mercurial"],
    "spirit breaker": ["barathrum", "sb"],
    "storm spirit": ["raijin", "ss"],
    "sven": [],
    "techies": ["goblin","gt","sqee","spleen","spoon"],
    "templar assassin": ["lanaya", "ta"],
    "terrorblade": ["tb"],
    "tidehunter": ["leviathan"],
    "timbersaw": ["rizzrack"],
    "tinker": ["boush"],
    "tiny": [],
    "treant protector": ["rooftrellen"],
    "troll warlord": ["tw"],
    "tusk": ["ymir"],
    "undying": ["dirge"],
    "vengeful spirit": ["shendelzare", "vs"],
    "venomancer": ["lesale"],
    "visage": [],
    "warlock": ["demnok", "wl"],
    "weaver": ["skitskurr"],
    "windranger": ["lyralei", "wr"],
    "winter wyvern": ["ww"],
    "witch doctor": ["zharvakko", "wd"],
    "wraith king": ["ostarion", "skeleton king", "wk", "sk"],
    "zeus": []
  },

  checkHeroAbbr: function (hero, name) {

    var heroAbbr = this.heroAbbrLookup[hero.toLowerCase ()];

    if (_.isUndefined (name) || _.isUndefined (heroAbbr))
      return false;

    name = name.toLowerCase ();

    for (var i = 0; i < heroAbbr.length; ++i)
      if (heroAbbr[i].indexOf (name) >= 0)
        return true;

    return false;
  },

  listHeroes: function (name) {
    $('#hero-list').html ('');
    _.each (heroes, function (hero, key) {

      if (!_.isUndefined (name) &&
          !DotaBuffCP.checkHeroAbbr (hero, name) &&
          hero.toLowerCase ().indexOf (name.toLowerCase ()) < 0) {
        return;
      }

      if (!heroes_bg[key].match(/^http/)) {
        heroes_bg[key] = 'http://www.dotabuff.com/' + heroes_bg[key];
      }

      $('#hero-list').append (
        $('<li>').attr ('data-hero-id', key).html (
          $('<img>').attr ('src', heroes_bg[key])
        ).append (hero)
      );
    });
  },

  calculate: function () {

    var advantages = Array.apply (null, new Array (heroes.length))
                       .map (Number.prototype.valueOf, 0.0);
    var nb =0;
    for (var h in this.lineup2) {
      var hid = this.lineup2[h];
      if (hid == -1)
        continue;
      nb++;
    }      
    for (var h in this.lineup) {      
      var hid = this.lineup[h];
      if (nb==5) hid = this.lineup2[h];

      if (hid == -1)
        continue;

      for (var i = 0; i < heroes.length; ++i) {
        if (_.isUndefined (win_rates[hid][i]) || _.isNull (win_rates[hid][i]))
          continue;
        //if (nb==4) {
        //  advantages[i] += parseFloat (win_rates[i][hid][0])*-1;        
        //} else {
          advantages[i] += parseFloat (win_rates[hid][i][0]);        
        //}
      }

    }

    return advantages;

  },

  calculateForRow: function (lineup) {
    var advantages = Array.apply (null, new Array (heroes.length))
                       .map (Number.prototype.valueOf, 0.0);
    
    for (var h = 0; h < 5; h++) {
      var hid = lineup[h];
      if (hid == -1)
        continue;

      if (_.isUndefined(win_rates[hid]) || _.isNull(win_rates[hid]))
        continue;

      for (var i = 0; i < heroes.length; ++i) {
        if (_.isUndefined (win_rates[hid][i]) || _.isNull (win_rates[hid][i]))
          continue;
        advantages[i] += parseFloat (win_rates[hid][i][0]);
      }
    }

    return advantages;
  },

  generateLink: function () {

    var link = '#';

    // Include top row (lineup)
    for (var i = 0; i < 5; i++) {
      if (this.lineup[i] == -1) {
        link += '/';
      } else {
        link += heroes[this.lineup[i]] + '/';
      }
    }

    // Include bottom row (lineup2)
    for (var j = 0; j < 5; j++) {
      if (this.lineup2[j] == -1) {
        link += '/';
      } else {
        link += heroes[this.lineup2[j]] + '/';
      }
    }

    link = link.replace(/ /g, '_');
    link = link.replace(/\/+$/, '');

    return link;
  },

  getVersion: function () {

    return this.VERSION + '.' + update_time;

  }

};



// Backward compatibility: heroes_wr should be provided by cs_db.json for counter pick display
if (typeof heroes_wr === 'undefined' || !Array.isArray(heroes_wr)) {
  var heroes_wr = [];
  if (typeof heroes !== 'undefined' && Array.isArray(heroes)) {
    for (var __k2 = 0; __k2 < heroes.length; ++__k2) heroes_wr[__k2] = 50.0;
  }
}

var __roleKeys = ['carry','mid','offlane','softsupport','hardsupport'];
if (typeof heroes_roles_db_wr === 'undefined' || typeof heroes_roles_db_wr !== 'object') {
  var heroes_roles_db_wr = {};
}
for (var __rk2 = 0; __rk2 < __roleKeys.length; ++__rk2) {
  var __role2 = __roleKeys[__rk2];
  if (typeof heroes_roles_db_wr[__role2] === 'undefined') heroes_roles_db_wr[__role2] = {};
  if (!Array.isArray(heroes_roles_db_wr[__role2].wr)) {
    heroes_roles_db_wr[__role2].wr = [];
    if (typeof heroes !== 'undefined' && Array.isArray(heroes)) {
      for (var __q = 0; __q < heroes.length; ++__q) heroes_roles_db_wr[__role2].wr[__q] = 50;
    }
  }
}

var MainView = Backbone.View.extend ({

  el: '#main-container',

  initialize: function () {
    this.$el.html (_.template ($('#main-view-template').html ()));
    DotaBuffCP.listHeroes ();
    $('#hero-search').focus ();
    var self = this;
    $(document).off('keydown.dotabuffcp');
    $(document).on('keydown.dotabuffcp', function (ev) {
      if (ev.keyCode == 27) {
        self.resetAll ();
      }
    });
  },

  events: {
    'keyup #hero-search': 'heroSearch',
    'click #hero-search-reset': 'heroSearchReset',
    'click #hero-list li': 'addHero',
    'click div.lineup div.col-md-2 img': 'removeHero',
    'change .hero-role-select': 'changeHeroRole',
    'click #reset-all': 'resetAll',
    'submit form': function () { return false; }
  },

  heroSearch: function (ev) {
    // reset if Esc pressed
    if (ev.keyCode == 27) {
      $(ev.currentTarget).val ('');
      this.heroSearchReset ();
    }
    // add first hero if enter pressed
    else if (ev.keyCode == 13) {
      this.addFirstHero ();
    }

    else {
      DotaBuffCP.listHeroes ($(ev.currentTarget).val ());
    }

    return false;
  },

  heroSearchReset: function () {
    DotaBuffCP.listHeroes ();
  },

  switchLink: function () {
    var link = DotaBuffCP.generateLink ();
    location.href = link;
  },

  addFirstHero: function () {
    $('#hero-list li:first').trigger ('click');
  },

  addHero: function (ev) {
    var hid = $(ev.currentTarget).attr ('data-hero-id');
    var pick_i = -1;

    // Keep the current search text and cursor focused so users can add multiple heroes quickly
    $('#hero-search').focus ();

    for (var i in DotaBuffCP.lineup)
      if (DotaBuffCP.lineup[i] == hid)
        return;

    for (var i = 0; i < 5; ++i)
      if (DotaBuffCP.lineup2[i] == hid)
        return;

    // Simple logic: Try bottom row first, then top row
    // Try to find empty slot in bottom row (lineup2)
    for (var i = 0; i < 5; ++i) {
      if (DotaBuffCP.lineup2[i] == -1) {
        pick_i = i + 5;  // Bottom row uses indices 5-9
        DotaBuffCP.lineup2[i] = hid;
        break;
      }
    }

    // Bottom row full? Try top row (lineup)
    if (pick_i == -1) {
      for (var i = 0; i < 5; ++i) {
        if (DotaBuffCP.lineup[i] == -1) {
          pick_i = i;
          DotaBuffCP.lineup[i] = hid;
          break;
        }
      }
    }

    // Both rows full? Can't add more heroes
    if (pick_i == -1) return;
    //console.log(DotaBuffCP);
    //console.log(heroes);
    //console.log(win_rates);
    //console.log(heroes_wr);
    // Always assign default role by slot index on new pick
    var slot = pick_i % 5;
    var defaultRoles = ['carry','mid','offlane','softsupport','hardsupport'];
    DotaBuffCP.roles[pick_i] = defaultRoles[slot];
    var role = DotaBuffCP.roles[pick_i];
    var selectHtml = this.roleSelectHtml(pick_i, role);
    $('#hero-' + pick_i).html (selectHtml + "<img src='" + heroes_bg[hid] + "' data-idx='" + pick_i + "'>");

    this.calculateAndShow ();
    this.switchLink ();
    // Ensure the search input retains focus after selection on iOS
    setTimeout(function(){ try { var el = document.getElementById('hero-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } catch(e){} }, 0);
  },

  addHeroToIndex: function (hid, pick_i) {
    var slot = pick_i % 5;
    var defaultRoles = ['carry','mid','offlane','softsupport','hardsupport'];
    DotaBuffCP.roles[pick_i] = defaultRoles[slot];
    var role = DotaBuffCP.roles[pick_i];
    var selectHtml = this.roleSelectHtml(pick_i, role);
    $('#hero-' + pick_i).html (selectHtml + "<img src='" + heroes_bg[hid] + "' data-idx='" + pick_i + "'>");
  },

  roleSelectHtml: function (idx, role) {
    var opts = [
      {v:'carry', t:'Carry'},
      {v:'mid', t:'Mid'},
      {v:'offlane', t:'Offlane'},
      {v:'softsupport', t:'Soft'},
      {v:'hardsupport', t:'Hard'}
    ];
    var html = "<select class='hero-role-select' data-idx='" + idx + "' style='font-size:14px; padding:0; margin:2px 0; width: 90px'>";
    for (var i=0;i<opts.length;i++) {
      var o=opts[i];
      html += "<option value='" + o.v + "'" + (role===o.v?" selected":"") + ">" + o.t + "</option>";
    }
    html += "</select>";
    return html;
  },

  getHeroIdAtSlot: function (idx) {
    if (idx < 5) return DotaBuffCP.lineup[idx];
    return DotaBuffCP.lineup2[idx-5];
  },

  getWrFor: function (heroId, idx) {
    var role = DotaBuffCP.roles[idx];
    var arr = heroes_roles_db_wr && heroes_roles_db_wr[role] && heroes_roles_db_wr[role].wr;
    var v = arr && arr[heroId] != null ? arr[heroId] : 50;  // Default 50%
    return parseFloat(v || 0);
  },

  

  changeHeroRole: function (ev) {
    var idx = parseInt($(ev.currentTarget).attr('data-idx'), 10);
    var role = $(ev.currentTarget).val();
    DotaBuffCP.roles[idx] = role;
    this.calculateAndShow();
  },

  removeHero: function (ev) {
    var i = parseInt($(ev.currentTarget).attr ('data-idx'), 10);
    
    // Clear hero from lineup
    if (i < 5) {
      DotaBuffCP.lineup[i] = -1;
    } else {
      DotaBuffCP.lineup2[i-5] = -1;
    }
    
    // Clear role (reset to default)
    DotaBuffCP.roles[i] = 'carry';
    
    // Clear HTML
    $('#hero-' + i).html ('');

    this.calculateAndShow ();
    this.switchLink ();
  },

  resetAll: function () {
    for (var i = 0; i < 5; ++i) {
      DotaBuffCP.lineup[i] = -1;
      $('#hero-' + i).html ('');
    }
    $('#score1').html('');
    $('#score2').html('');
    $('#total').html('');
    for (var i = 0; i < 5; ++i) {
      DotaBuffCP.lineup2[i] = -1;
      $('#hero-' + (i+5)).html ('');
    }

    this.calculateAndShow ();
    this.switchLink ();
  },

  isEmpty: function () {
    for (var i in DotaBuffCP.lineup)
      if (DotaBuffCP.lineup[i] != -1)
        return false;
    for (var i = 0; i < 5; ++i)
      if (DotaBuffCP.lineup2[i] != -1)
        return false;
    return true;
  },

  showAdvantages: function (div, advantages) {
    var template = $('#counter-template').html ();
    $('#' + div).html ('');
    _.each (advantages, function (advantage, i) {

      for (var l in DotaBuffCP.lineup)
        if (advantage[1] == DotaBuffCP.lineup[l])
          return;

      $('#' + div).append (_.template (template, {
                                     hero_bg: heroes_bg[advantage[1]],
                                     hero_name: heroes[advantage[1]],
                                     win_rate: heroes_wr[advantage[1]],
                                     advantage: advantage[0].toFixed (2) * -1
                                                 }));
    });
  },

  showAdvantagesForRow: function (div, advantages) {
    var template = $('#counter-template').html ();
    
    $('#' + div).html ('');
    var added = 0;
    _.each (advantages, function (advantage, i) {

      // Exclude heroes from both lineups
      for (var l = 0; l < 5; l++) {
        if (advantage[1] == DotaBuffCP.lineup[l])
          return;
        if (advantage[1] == DotaBuffCP.lineup2[l])
          return;
      }

      $('#' + div).append (_.template (template, {
                                     hero_bg: heroes_bg[advantage[1]],
                                     hero_name: heroes[advantage[1]],
                                     win_rate: heroes_wr[advantage[1]],
                                     advantage: advantage[0].toFixed (2) * -1
                                                 }));
      added++;
    });
    
  },

  calculateAndShow: function () {
    

    if (this.isEmpty ()) {
      
      $('div.lineup-title').show ();
      $('div.pick-title').hide ();
      $('#reset-all').hide ();
      $('#counters').hide ();
      return;
    } else {
      
      $('div.lineup-title').removeAttr('style').hide ();
      $('div.pick-title').show ();
      $('#reset-all').show ();
      $('#counters').show ();
    }

    
    var advantages = DotaBuffCP.calculate ();
    

    //console.log(advantages);
    //console.log("lineup ");
    //console.log(DotaBuffCP.lineup);
    //console.log("lineup2 ");
    //console.log(DotaBuffCP.lineup2);    
    var data = '<div class="col-md-1 col-xs-1"></div>'; 
    var data2 = '<div class="col-md-1 col-xs-1"></div>';
    var nb1 =0;
    var nb2=0;
    var is_full = true;
    for (var i=0; i <5; i++) {
        if (DotaBuffCP.lineup[i] == -1 || DotaBuffCP.lineup2[i] == -1) {
          is_full = false;
        }
    }
    
    

    if (is_full) {
      
      var sumNb1a = 0.0;
      var sumNb2a = 0.0;
      for (var i=0; i <5; i++) {
        var id1 = DotaBuffCP.lineup[i];
        var id3 = DotaBuffCP.lineup2[i];
        nb1 += this.getWrFor(id1, i);
        nb2 += this.getWrFor(id3, i+5);
        var nb1a = 0;
        var nb2a = 0;
        for (var j=0; j <5; j++) {   
          var id2 = DotaBuffCP.lineup2[j];    
          var id4 = DotaBuffCP.lineup[j];
          if (id2 != -1 && win_rates[id2] && win_rates[id2][id1]) {
            nb1a += parseFloat(win_rates[id2][id1][0])*-1;
          }
          if (id4 != -1 && win_rates[id4] && win_rates[id4][id3]) {
            nb2a += parseFloat(win_rates[id4][id3][0])*-1;
          }
        }
        sumNb1a += nb1a;
        sumNb2a += nb2a;
        var advDisp1 = (nb1a * -1);
        var advDisp2 = (nb2a * -1);
        var advStr1 = (advDisp1 < 0 ? '-' : '') + Math.abs(advDisp1).toFixed(2);
        var advStr2 = (advDisp2 < 0 ? '-' : '') + Math.abs(advDisp2).toFixed(2);
        var adv1Class = (advDisp1 < 0) ? 'alert alert-danger' : 'alert alert-success';
        var adv2Class = (advDisp2 < 0) ? 'alert alert-danger' : 'alert alert-success';
        var wr1Txt = this.getWrFor(id1, i).toFixed(2);
        var wr2Txt = this.getWrFor(id3, i+5).toFixed(2);
        var line1a = "<span style='white-space:nowrap; font-size:14px; line-height:17px'>" + wr1Txt + " + " + "<span class='" + adv1Class + "' style='padding:0px 2px; display:inline-block; font-size:14px'>" + advStr1 + "</span></span>";
        var line1b = "<span style='white-space:nowrap; font-size:14px; line-height:17px'>" + wr2Txt + " + " + "<span class='" + adv2Class + "' style='padding:0px 2px; display:inline-block; font-size:14px'>" + advStr2 + "</span></span>";
        var cell1 = "<div class='col-md-2 col-xs-2'>" + line1a + "</div>";
        var cell2 = "<div class='col-md-2 col-xs-2'>" + line1b + "</div>";
        data += cell1;
        data2 += cell2;
        nb1+= nb1a*-1;
        nb2+= nb2a*-1;
      }
      var rightSum1 = "<div class=\"col-md-1 col-xs-1\" style=\"text-align:right\">" + nb1.toFixed(2) + "</div>";
      var rightSum2 = "<div class=\"col-md-1 col-xs-1\" style=\"text-align:right\">" + nb2.toFixed(2) + "</div>";
      $('#score1').html(data + rightSum1);
      $('#score2').html(data2 + rightSum2);
      var wrdelta = (nb1 - nb2).toFixed(2);
      var wrClass = (wrdelta > 0) ? 'alert alert-success' : 'alert alert-danger';
      var wrBubble = "<span class='" + wrClass + "' style='display:inline-block; padding:4px 10px 4px 6px; margin:0; font-size:16px; white-space:nowrap'>= " + wrdelta + "</span>";
      $('#total').html(
        "<div class='col-md-1 col-xs-1'></div>" +
        "<div class='col-md-10 col-xs-10' style='display:flex; justify-content:center; align-items:center; gap:4px; margin-left:15px; flex-wrap:nowrap'>" +
          wrBubble +
        "</div>" +
        "<div class='col-md-1 col-xs-1'></div>"
      );
    }
    
    

    // Check if top row has any heroes
    var hasTopRow = false;
    for (var i = 0; i < 5; i++) {
      if (DotaBuffCP.lineup[i] != -1) {
        hasTopRow = true;
        break;
      }
    }

    // Check if bottom row has any heroes
    var hasBottomRow = false;
    for (var i = 0; i < 5; i++) {
      if (DotaBuffCP.lineup2[i] != -1) {
        hasBottomRow = true;
        break;
      }
    }

    

    // Calculate and show counter-picks for top row (Best then Worst)
    if (hasTopRow) {
      var advantagesTop = DotaBuffCP.calculateForRow(DotaBuffCP.lineup);
      for (var i = 0; i < advantagesTop.length; i++)
        advantagesTop[i] = [advantagesTop[i], i];
      advantagesTop.sort(function (l, r) {
        return l[0] < r[0] ? -1 : 1;
      });

      // Swap mapping if "best" should be the most negative (largest counter)
      this.showAdvantagesForRow('best-picks-top', advantagesTop.slice().reverse().slice(0, advantagesTop.length / 2));
      this.showAdvantagesForRow('worse-picks-top', advantagesTop.slice(0, advantagesTop.length / 2));
    } else {
      $('#best-picks-top').html('');
      $('#worse-picks-top').html('');
    }

    // Calculate and show counter-picks for bottom row (Best then Worst)
    if (hasBottomRow) {
      var advantagesBottom = DotaBuffCP.calculateForRow(DotaBuffCP.lineup2);
      for (var i = 0; i < advantagesBottom.length; i++)
        advantagesBottom[i] = [advantagesBottom[i], i];
      advantagesBottom.sort(function (l, r) {
        return l[0] < r[0] ? -1 : 1;
      });

      // Swap mapping for consistency
      this.showAdvantagesForRow('best-picks-bottom', advantagesBottom.slice().reverse().slice(0, advantagesBottom.length / 2));
      this.showAdvantagesForRow('worse-picks-bottom', advantagesBottom.slice(0, advantagesBottom.length / 2));
    } else {
      $('#best-picks-bottom').html('');
      $('#worse-picks-bottom').html('');
    }

    $('#counters').scrollTop (0);
  }

});



var AppRouter = Backbone.Router.extend ({

  initialize: function () {
    this.route (/^(.*?)$/, 'sozdeHerolar');
  },

  sozdeHerolar: function (heroSelection) {
    if (DotaBuffCP.initialized)
      return;
    else
      DotaBuffCP.initialize ();

    var mainView = new MainView ();

    // Do not auto-pick any heroes when there is no selection
    if (_.isNull(heroSelection) || heroSelection === '' || heroSelection.replace(/\//g, '') === '') {
      mainView.calculateAndShow ();
      return;
    }

    // Parse up to 10 heroes from the URL and fill both rows
    heroSelection = heroSelection.replace (/_/g, ' ');
    var selectedHeroes = heroSelection.split ('/');

    var added = 0;
    for (var i = 0; i < selectedHeroes.length; i++) {

      if (_.isEmpty (selectedHeroes[i]))
        continue;

      var hid = DotaBuffCP.heroId (selectedHeroes[i]);

      if (hid == -1)
        continue;

      if (added < 5) {
        DotaBuffCP.lineup[added] = hid;
        mainView.addHeroToIndex (hid, added);
      } else if (added < 10) {
        var idx = added; // 5..9 correspond to bottom row
        DotaBuffCP.lineup2[added - 5] = hid;
        mainView.addHeroToIndex (hid, idx);
      }

      added++;
      if (added >= 10) break;
    }

    mainView.calculateAndShow ();
  },

  

});


$(document).ready (function () {
  // set version
  $('#version').text (DotaBuffCP.getVersion ());

  // Clear hero selection hash on reload so page starts clean
  try {
    var currentHash = window.location.hash || '';
    if (currentHash.indexOf('/') !== -1) {
      // Replace instead of assign to avoid polluting history
      window.location.replace('#');
    }
  } catch (e) {}

  var appRouter = new AppRouter ();

  Backbone.history.start ({ pushState: false, root: '/dotabuffcp/' });
});

